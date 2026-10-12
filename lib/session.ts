// The judging session: video -> pose model -> smoothing -> detectors -> scoreboard.
// Browser only (camera, <video>, requestAnimationFrame). No React in here: React components read
// `state` through subscribe()/getSnapshot() (see components/useJudgingSession.ts) and call the methods.
//
// One main button walks people through the app:
//   Turn on camera  ->  Start  ->  Finish  ->  Try again

import { createPoseTracker, type ModelVariant, type PoseTracker } from './pose';
import { LandmarkSmoother } from './oneEuro';
import { legLengthRatios, type Landmarks } from './geometry';
import { SplitLeapDetector, legsFullLength } from './elements/splitLeap';
import { PasseDetector } from './elements/passe';
import { BalanceDetector, setPoseLibrary } from './elements/balances';
import { Scoreboard, type JudgeInputs } from './scoring';
import { RULE_SOURCE } from './rules';
import { drawSkeleton } from './draw';
import { currentLibrary, teach } from './ui/libraryStore';
import { liveMessage, type Tone } from './ui/plain';
import { TeachRecorder } from './ui/teachRecorder';
import { POSE_NAMES, type PoseLabel } from './library/recognizer';
import { downloadFile } from './ui/download';
import type { ElementEvent } from './types';

export type Source = 'camera' | 'file' | null;

/** Big message in the middle of the video. */
export interface StageMessage {
  title: string;
  detail: string;
}

/** The box on the video: which balance, hold dots, one plain sentence. */
export interface LiveView {
  pose: string;
  showDots: boolean;
  dots: number; // 0..4, fill in one second
  tone: Tone | 'idle';
  text: string;
}

/** A card shown on the video for a few seconds after each judged move. */
export interface MoveCardData {
  id: number;
  event: ElementEvent;
  leaving: boolean;
}

/** Technical details shown in Settings. */
export interface TechReadout {
  fps: number | null;
  view: 'yes' | 'no' | null; // legs seen side-on
  split: string;
  shape: string;
  releve: string;
  state: string;
}

export interface SessionState {
  source: Source;
  judging: boolean;
  finished: boolean;
  busy: boolean; // the camera / model is loading
  message: StageMessage | null;
  live: LiveView | null;
  cards: MoveCardData[];
  scoreVersion: number; // goes up whenever the scoreboard changes
  model: ModelVariant;
  focusOnly: boolean; // only judge the three balances
  teachRecording: boolean;
  teachStatus: string;
  tech: TechReadout;
  resultsOpen: boolean;
  resultsDurationMs: number | null;
  resultsRequest: number; // goes up each time results are opened by an action (to scroll to them)
}

const START_MESSAGE: StageMessage = {
  title: 'Turn on the camera to begin',
  detail: 'Stand sideways to the camera, with your whole body in the picture.',
};

const EMPTY_TECH: TechReadout = { fps: null, view: null, split: '–', shape: '–', releve: '–', state: '–' };

export class JudgingSession {
  // ---------- State React shows ----------
  state: SessionState = {
    source: null,
    judging: false,
    finished: false,
    busy: false,
    message: START_MESSAGE,
    live: null,
    cards: [],
    scoreVersion: 0,
    model: 'heavy',
    focusOnly: true,
    teachRecording: false,
    teachStatus: '',
    tech: EMPTY_TECH,
    resultsOpen: false,
    resultsDurationMs: null,
    resultsRequest: 0,
  };
  private listeners = new Set<() => void>();

  // ---------- Engine ----------
  readonly scoreboard = new Scoreboard();
  private smoother = new LandmarkSmoother();
  private leap: SplitLeapDetector;
  private passe: PasseDetector;
  private balance: BalanceDetector;
  private recorder: TeachRecorder;
  private tracker: PoseTracker | null = null;
  private trackerVariant: ModelVariant | null = null;
  private fileName: string | null = null;
  private routineStartMs = 0;
  private stoppedAt: number | null = null;
  private lastVideoTime = -1;
  private fpsFrames = 0;
  private fpsSince = 0;
  private nextCardId = 1;
  private techVisible = false;
  private lastLiveKey = '';
  private lastTechKey = '';

  // ---------- Page elements (set by attach) ----------
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private stage: HTMLElement | null = null;
  private frameRequest = 0;

  constructor() {
    // Only the three balances count unless the setting says otherwise; leap and passé still run
    // (the leap detector also tells the balance detector when she is in the air).
    const onOtherEvent = (event: ElementEvent) => {
      if (!this.state.focusOnly) this.onEvent(event);
    };
    this.leap = new SplitLeapDetector(onOtherEvent);
    this.passe = new PasseDetector(onOtherEvent);
    this.balance = new BalanceDetector((event) => this.onEvent(event));
    this.recorder = new TeachRecorder((label, signatures) => this.finishTeachRecording(label, signatures));
  }

  // ---------- For React (useSyncExternalStore) ----------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SessionState => this.state;

  private set(patch: Partial<SessionState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  // ---------- Page elements ----------

  /** Connects the session to the page and starts the frame loop. Returns a function that stops it. */
  attach(video: HTMLVideoElement, canvas: HTMLCanvasElement, stage: HTMLElement): () => void {
    this.video = video;
    this.canvas = canvas;
    this.stage = stage;
    // Recognize poses with the library: shipped examples + the ones your team taught.
    setPoseLibrary(currentLibrary());
    this.fpsSince = performance.now();

    // Jumping in a clip breaks motion tracking; the end of a clip finishes the routine.
    const onSeeked = () => this.resetTracking();
    const onEnded = () => this.setJudging(false);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);

    const loop = () => {
      this.frameRequest = requestAnimationFrame(loop);
      this.tick();
    };
    this.frameRequest = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(this.frameRequest);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
      this.stopSource();
      this.tracker?.close();
      this.tracker = null;
      this.trackerVariant = null;
    };
  }

  // ---------- Model ----------

  private async ensureTracker(): Promise<void> {
    const variant = this.state.model;
    if (this.tracker && this.trackerVariant === variant) return;
    this.setMessage('Getting the camera ready…', variant === 'heavy' ? 'The first time this takes about half a minute.' : '');
    this.tracker?.close();
    this.tracker = await createPoseTracker(variant);
    this.trackerVariant = variant;
    this.setMessage(null);
  }

  async setModel(model: ModelVariant): Promise<void> {
    this.set({ model });
    if (this.state.source) await this.ensureTracker();
  }

  setFocusOnly(focusOnly: boolean): void {
    this.set({ focusOnly });
  }

  // ---------- Sources ----------

  private async startCamera(): Promise<void> {
    const video = this.video!;
    this.set({ busy: true }); // the model can take a while to load the first time
    try {
      this.stopSource();
      await this.ensureTracker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      video.srcObject = stream;
      video.controls = false;
      await video.play();
      this.set({ source: 'camera' });
      this.onSourceReady();
    } catch (err) {
      console.error(err);
      const blocked = err instanceof DOMException && err.name === 'NotAllowedError';
      this.setMessage(blocked ? 'The camera is blocked' : 'The camera could not start',
        blocked ? 'Allow camera access in your browser, then press the button again.' : errorText(err));
    }
    this.set({ busy: false });
  }

  async loadFile(file: File): Promise<void> {
    const video = this.video!;
    try {
      this.stopSource();
      await this.ensureTracker();
      video.srcObject = null;
      video.src = URL.createObjectURL(file);
      video.controls = true;
      this.fileName = file.name;
      this.set({ source: 'file' });
      await new Promise((resolve) => { video.onloadeddata = resolve; });
      this.onSourceReady();
      this.newRoutine();
      this.setJudging(true); // judge the clip from the start
      await video.play();
    } catch (err) {
      console.error(err);
      this.setMessage('The video could not be opened', errorText(err));
    }
  }

  private stopSource(): void {
    const video = this.video;
    if (!video) return;
    const stream = video.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (video.src) URL.revokeObjectURL(video.src);
    video.removeAttribute('src');
    video.srcObject = null;
    this.set({ source: null, live: null });
    this.setJudging(false, { quiet: true });
  }

  private onSourceReady(): void {
    this.fitOverlayToVideo();
    this.resetTracking();
    this.setMessage(null);
  }

  /** Keeps the overlay canvas the same size as the video (cameras can change resolution). */
  private fitOverlayToVideo(): void {
    const { video, canvas, stage } = this;
    if (!video || !canvas || !stage) return;
    const { videoWidth: w, videoHeight: h } = video;
    if (!w || (canvas.width === w && canvas.height === h)) return;
    canvas.width = w;
    canvas.height = h;
    stage.style.aspectRatio = `${w} / ${h}`;
  }

  // ---------- Main loop ----------

  private currentTimeMs(): number {
    // Files: use the video clock, so event times match the clip. Camera: wall clock.
    return this.state.source === 'file' && this.video ? this.video.currentTime * 1000 : performance.now();
  }

  private tick(): void {
    const video = this.video;
    if (!this.tracker || !this.state.source || !video || video.readyState < 2) return;
    if (video.currentTime === this.lastVideoTime) return; // no new frame yet
    this.lastVideoTime = video.currentTime;
    this.fitOverlayToVideo();

    const raw = this.tracker.detect(video);
    const t = this.currentTimeMs();
    let lm: Landmarks | null = null;
    if (raw) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      lm = this.smoother.smooth(raw.map((p) => ({ x: p.x * w, y: p.y * h, visibility: p.visibility ?? 0 })), t / 1000);
    } else {
      this.smoother.reset(); // don't drag old positions into the next person seen
    }
    // Detectors also get frames with nobody visible (lm = null), so a shape that ends by
    // leaving the frame is still closed and judged.
    this.leap.update({ t, lm });
    this.passe.update({ t, lm, airborne: this.leap.live.airborne });
    this.balance.update({ t, lm, airborne: this.leap.live.airborne });

    const ctx = this.canvas?.getContext('2d');
    if (ctx) drawSkeleton(ctx, lm, this.legColor());
    if (this.techVisible) this.updateTech(lm);
    this.updateLive(this.recorder.capture(lm, this.leap.live.airborne));
    this.countFps();
  }

  private legColor(): string {
    if (this.leap.live.airborne) return '#f08c9c';
    if (this.passe.live.inShape || this.balance.live.shape) return '#4cc38a'; // green: holding a balance
    return '#7aa7ff';
  }

  /** The box on the video. Only re-renders when what it says changes. */
  private updateLive(teachMessage: string | null): void {
    let live: LiveView;
    if (teachMessage) {
      live = { pose: 'Teaching', showDots: false, dots: 0, tone: 'idle', text: teachMessage };
    } else {
      const m = liveMessage(this.balance.live);
      live = { pose: m.pose ?? 'Watching', showDots: Boolean(m.pose), dots: m.dots, tone: m.tone, text: m.text };
    }
    const key = JSON.stringify(live);
    if (key === this.lastLiveKey) return;
    this.lastLiveKey = key;
    this.set({ live });
  }

  private countFps(): void {
    this.fpsFrames += 1;
    const now = performance.now();
    if (now - this.fpsSince >= 1000) {
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsSince));
      this.set({ tech: { ...this.state.tech, fps } });
      this.fpsFrames = 0;
      this.fpsSince = now;
    }
  }

  /** Settings → Technical details is open: keep its numbers up to date. */
  setTechVisible(visible: boolean): void {
    this.techVisible = visible;
  }

  private updateTech(lm: Landmarks | null): void {
    const { fps } = this.state.tech;
    let tech: TechReadout;
    if (!lm) {
      tech = { ...EMPTY_TECH, fps, state: 'nobody in view' };
    } else {
      const { leap, passe, balance } = this;
      tech = {
        fps,
        view: legsFullLength(legLengthRatios(lm)) ? 'yes' : 'no',
        split: leap.live.splitDeg == null ? '–' : `${Math.round(leap.live.splitDeg)}°`,
        shape: balance.live.label ?? (passe.live.inShape ? 'passé' : '–'),
        releve: passe.live.releve == null ? '?' : passe.live.releve ? 'yes' : 'no',
        state: leap.live.airborne ? 'in the air' : balance.live.shape || passe.live.inShape ? 'balance' : 'on the floor',
      };
    }
    const key = JSON.stringify(tech);
    if (key === this.lastTechKey) return;
    this.lastTechKey = key;
    this.set({ tech });
  }

  // ---------- Judged moves ----------

  private onEvent(event: ElementEvent): void {
    if (!this.state.judging) return;
    this.scoreboard.add({ ...event, routineMs: Math.max(0, event.t - this.routineStartMs) });
    this.showMoveCard(event);
    this.set({ scoreVersion: this.state.scoreVersion + 1 });
  }

  /** Slides a card onto the video for a judged move; it disappears after a few seconds. */
  private showMoveCard(event: ElementEvent): void {
    const id = this.nextCardId++;
    this.set({ cards: [{ id, event, leaving: false }, ...this.state.cards].slice(0, 2) });
    setTimeout(() => this.set({ cards: this.state.cards.map((c) => (c.id === id ? { ...c, leaving: true } : c)) }), 4000);
    setTimeout(() => this.set({ cards: this.state.cards.filter((c) => c.id !== id) }), 4600);
  }

  /** Judge agrees (false) or disagrees (true) with an automated call. */
  setRejected(id: number, rejected: boolean): void {
    this.scoreboard.setRejected(id, rejected);
    this.set({ scoreVersion: this.state.scoreVersion + 1 });
  }

  // ---------- The main button ----------

  onMainButton(): void {
    const { source, judging, finished } = this.state;
    if (!source) void this.startCamera();
    else if (!judging && finished) {
      this.newRoutine();
      this.setJudging(true);
    } else this.setJudging(!judging);
  }

  private setJudging(on: boolean, { quiet = false } = {}): void {
    const stopping = !on && this.state.judging;
    if (stopping) {
      this.passe.flush(); // judge a balance still being held
      this.balance.flush();
      this.stoppedAt = this.currentTimeMs();
    }
    const patch: Partial<SessionState> = { judging: on };
    if (on) {
      patch.finished = false;
      patch.resultsOpen = false;
      if (this.state.source === 'camera' && this.scoreboard.events.length === 0) this.routineStartMs = performance.now();
    }
    this.set(patch);
    if (stopping && !quiet) {
      this.set({ finished: true });
      this.openResults();
    }
  }

  /** "Start over": forget all moves. */
  newRoutine(): void {
    this.scoreboard.reset();
    this.routineStartMs = this.state.source === 'camera' ? performance.now() : 0;
    this.stoppedAt = null;
    this.resetTracking();
    this.set({ finished: false, resultsOpen: false, cards: [], scoreVersion: this.state.scoreVersion + 1 });
  }

  private resetTracking(): void {
    this.smoother.reset();
    this.leap.reset();
    this.passe.reset();
    this.balance.reset();
    this.lastVideoTime = -1;
  }

  // ---------- Results ----------

  openResults(): void {
    const end = this.stoppedAt ?? this.currentTimeMs();
    this.set({
      resultsOpen: true,
      resultsDurationMs: Math.max(0, end - this.routineStartMs),
      resultsRequest: this.state.resultsRequest + 1,
    });
  }

  closeResults(): void {
    this.set({ resultsOpen: false });
  }

  // ---------- Teach poses ----------

  /** Record 3 s: needs a running camera or video, and not while judging. */
  startTeachRecording(label: PoseLabel): void {
    if (this.state.source === null || this.state.judging) {
      this.set({ teachStatus: 'Start the camera first, and stop judging while you teach.' });
      return;
    }
    this.recorder.start(label);
    this.set({ teachRecording: true });
  }

  private finishTeachRecording(label: PoseLabel, signatures: number[][]): void {
    this.set({ teachRecording: false });
    if (signatures.length === 0) {
      this.set({ teachStatus: 'Nothing recorded: the whole body and both feet must be in view.' });
      return;
    }
    const saved = teach(label, signatures);
    this.libraryChanged(`Added ${signatures.length} examples of ${POSE_NAMES[label]}.${saved ? '' : ' (Not saved in this browser: they last until you close the page.)'}`);
  }

  /** Taught poses changed: use them right away and show a message. */
  libraryChanged(message: string): void {
    setPoseLibrary(currentLibrary());
    this.set({ teachStatus: message });
  }

  setTeachStatus(teachStatus: string): void {
    this.set({ teachStatus });
  }

  // ---------- Messages and records ----------

  private setMessage(title: string | null, detail = ''): void {
    this.set({ message: title ? { title, detail } : null });
  }

  /** Downloads a complete record of every call, for the competition file. */
  exportAudit(judge: JudgeInputs): void {
    const audit = this.scoreboard.toAudit(judge, {
      app: 'Rhymnast',
      ruleSource: RULE_SOURCE,
      source: this.state.source === 'file' ? `file: ${this.fileName}` : this.state.source,
      poseModel: `MediaPipe Pose Landmarker (${this.trackerVariant}, ${this.tracker?.delegate})`,
    });
    downloadFile(`rhymnast-record-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(audit, null, 2), 'application/json');
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

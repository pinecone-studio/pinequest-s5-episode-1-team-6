// The judging session: video -> pose model -> smoothing -> detectors -> scoreboard.
// Browser only (camera, <video>, requestAnimationFrame). No React in here: React components read
// `state` through subscribe()/getSnapshot() (see components/useJudgingSession.ts) and call the methods.
//
// One main button walks people through the app:
//   Turn on camera  ->  Start  ->  Finish  ->  Try again
//
// Three sports (lib/sport.ts): rhythmic gymnastics runs the balance / leap / pivot detectors in
// lib/elements/, cheerleading the jump and motion detectors in lib/cheer/, ballet the pose / pirouette /
// grand jeté detectors in lib/ballet/. Only one sport's detectors run at a time.

import { createPoseTracker, preloadPoseModel, watchModelDownload, type ModelVariant, type PoseTracker } from './pose';
import { LandmarkSmoother } from './oneEuro';
import { legLengthRatios, type Landmarks } from './geometry';
import { SplitLeapDetector, legsFullLength } from './elements/splitLeap';
import { PasseDetector } from './elements/passe';
import { AttitudePivotDetector } from './elements/attitudePivot';
import { BalanceDetector, setPoseLibrary } from './elements/balances';
import { Scoreboard, type JudgeInputs } from './scoring';
import { ELEMENTS, RULE_SOURCE } from './rules';
import { cheerAngles, drawLegAngles, drawSkeleton, legAngles, type AnglesFn } from './draw';
import { CheerJumpDetector } from './cheer/jumps';
import { MotionDetector } from './cheer/motions';
import { CHEER_RULE_SOURCE } from './cheer/rules';
import { BalletPoseDetector, setBalletLibrary } from './ballet/poses';
import { PirouetteDetector } from './ballet/pirouette';
import { GrandJeteDetector } from './ballet/jete';
import { balletLibrary } from './ballet/library';
import { BALLET_RULE_SOURCE } from './ballet/rules';
import { SPORT_TEXT, type Sport } from './sport';
import { gymnasticsLibrary } from './ui/libraryStore';
import { teachKitFor, type TeachKit } from './ui/teachKits';
import { balletLiveMessage, cheerLiveMessage, describeMove, forVideo, liveMessage, mistakeLabel, modelDownloadText, pivotMessage, type Tone } from './ui/plain';
import { RoutineRecorder } from './recording/routineRecorder';
import { cutClip } from './recording/clipCutter';
import { clipFileName, clipWindow, videoExtension } from './recording/clipWindows';
import { saveRoutine, type SavedMove } from './recording/clipStore';
import { TeachRecorder } from './ui/teachRecorder';
import { downloadFile } from './ui/download';
import type { ElementEvent } from './types';

export type Source = 'camera' | 'file' | null;

/** Front camera ('user') or back camera ('environment', for filming someone else with a phone or tablet). */
export type CameraFacing = 'user' | 'environment';

/** Big message in the middle of the video. */
export interface StageMessage {
  title: string;
  detail: string;
  progress?: number; // 0..1, shown as a bar (model download)
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

/** The video of a move, with any mistake marked on it, and its cover photo (made after Finish). */
export type MoveVideo =
  | { status: 'preparing' }
  | { status: 'failed' }
  | { status: 'ready'; clip: Blob; clipUrl: string; clipName: string; photoUrl: string };

export interface SessionState {
  sport: Sport;
  source: Source;
  judging: boolean;
  finished: boolean;
  busy: boolean; // the camera / model is loading
  modelReady: boolean; // the pose model is loaded (judging needs it; the camera can run without it)
  facing: CameraFacing;
  cameraCount: number; // cameras on this device (the switch button needs 2 or more)
  message: StageMessage | null;
  live: LiveView | null;
  cards: MoveCardData[];
  scoreVersion: number; // goes up whenever the scoreboard changes
  model: ModelVariant;
  focusOnly: boolean; // only judge the focus moves (balances, stag leap, attitude pivot)
  teachRecording: boolean;
  teachStatus: string;
  tech: TechReadout;
  resultsOpen: boolean;
  resultsDurationMs: number | null;
  resultsRequest: number; // goes up each time results are opened by an action (to scroll to them)
  moveVideos: Record<number, MoveVideo>; // by event id: every judged move
  videosSaved: boolean | null; // saved in this browser (null: not tried yet)
}

/** The message on the video before the camera is on. */
const startMessage = (sport: Sport): StageMessage => SPORT_TEXT[sport].startMessage;

const EMPTY_TECH: TechReadout = { fps: null, view: null, split: '–', shape: '–', releve: '–', state: '–' };

export class JudgingSession {
  // ---------- State React shows ----------
  state: SessionState = {
    sport: 'gymnastics',
    source: null,
    judging: false,
    finished: false,
    busy: false,
    modelReady: false,
    facing: 'user',
    cameraCount: 0,
    message: startMessage('gymnastics'),
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
    moveVideos: {},
    videosSaved: null,
  };
  private listeners = new Set<() => void>();

  // ---------- Engine ----------
  readonly scoreboard = new Scoreboard();
  private smoother = new LandmarkSmoother();
  private leap: SplitLeapDetector;
  private passe: PasseDetector;
  private pivot: AttitudePivotDetector;
  private balance: BalanceDetector;
  private cheerJumps: CheerJumpDetector;
  private motions: MotionDetector;
  private balletPoses: BalletPoseDetector;
  private pirouette: PirouetteDetector;
  private jete: GrandJeteDetector;
  private recorder: TeachRecorder;
  private routineRecorder = new RoutineRecorder();
  private videoRun = 0; // goes up when a new routine starts, so older video work stops
  private videoUrls: string[] = [];
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
  private anglesVisible = false;
  private lastLiveKey = '';
  private lastTechKey = '';

  // ---------- Page elements (set by attach) ----------
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private stage: HTMLElement | null = null;
  private frameRequest = 0;

  constructor() {
    // Only the focus moves count unless the setting says otherwise: the balances, the stag leap and the
    // attitude pivot. Split leap and passé still run (the leap detector also tells the balance detector
    // when she is in the air).
    const onOtherEvent = (event: ElementEvent) => {
      if (!this.state.focusOnly || event.code === ELEMENTS.STAG_LEAP.code) this.onEvent(event);
    };
    this.leap = new SplitLeapDetector(onOtherEvent);
    this.passe = new PasseDetector(onOtherEvent);
    this.pivot = new AttitudePivotDetector((event) => this.onEvent(event));
    this.balance = new BalanceDetector((event) => this.onEvent(event));
    this.cheerJumps = new CheerJumpDetector((event) => this.onEvent(event));
    this.motions = new MotionDetector((event) => this.onEvent(event));
    this.balletPoses = new BalletPoseDetector((event) => this.onEvent(event));
    this.pirouette = new PirouetteDetector((event) => this.onEvent(event));
    this.jete = new GrandJeteDetector((event) => this.onEvent(event));
    this.recorder = new TeachRecorder((kit, label, signatures) => this.finishTeachRecording(kit, label, signatures));
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

  /**
   * Connects the session to the page and starts the frame loop. Returns a function that stops it.
   * With cacheComponents, Next.js hides a page on navigation instead of unmounting it (<Activity>):
   * the stop function runs, but this session, the results and the page's DOM stay, and attach runs
   * again on return. So stopping turns the camera off and clears what it drew (stopSource), but keeps
   * the results and their move videos.
   */
  attach(video: HTMLVideoElement, canvas: HTMLCanvasElement, stage: HTMLElement): () => void {
    this.video = video;
    this.canvas = canvas;
    this.stage = stage;
    // Recognize poses with the libraries: shipped examples + the ones your team taught.
    this.loadLibraries();
    this.fpsSince = performance.now();
    // Download the model now, while the person reads the page, so "Turn on camera" is quick.
    preloadPoseModel(this.state.model);

    // Jumping in a clip breaks motion tracking; the end of a clip finishes the routine, and the live box
    // goes (nothing is live once the clip has stopped).
    const onSeeked = () => this.resetTracking();
    const onEnded = () => {
      this.setJudging(false);
      this.clearLive();
    };
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
      this.set({ modelReady: false });
      this.routineRecorder.discard();
    };
  }

  // ---------- Model ----------

  private async ensureTracker(): Promise<void> {
    const variant = this.state.model;
    if (this.tracker && this.trackerVariant === variant) return;
    // Take the old model out of the frame loop before closing it: a closed model must never be called.
    const old = this.tracker;
    this.tracker = null;
    this.trackerVariant = null;
    this.set({ modelReady: false });
    old?.close();

    // Loader on the video: "40%" and a bar while it downloads (usually already preloaded).
    const title = 'Loading the pose model…';
    this.set({ message: { title, detail: 'Almost ready…' } });
    let shown = '';
    const stopWatching = watchModelDownload(variant, ({ loaded, total }) => {
      const detail = modelDownloadText(loaded, total);
      const progress = total ? Math.min(1, loaded / total) : undefined;
      const key = `${detail}|${progress === undefined ? '' : Math.floor(progress * 100)}`;
      if (key === shown) return; // at most one update per percent
      shown = key;
      this.set({ message: { title, detail, progress } });
    });
    try {
      this.tracker = await createPoseTracker(variant);
    } finally {
      stopWatching();
    }
    this.trackerVariant = variant;
    this.set({ modelReady: true });
    this.setMessage(null);
  }

  /** Settings → Camera accuracy. Loads the new model at once if a camera or video is running. */
  async setModel(model: ModelVariant): Promise<void> {
    this.set({ model });
    if (!this.state.source) {
      preloadPoseModel(model);
      return;
    }
    this.set({ busy: true });
    try {
      await this.ensureTracker();
    } catch (err) {
      console.error(err);
      this.setMessage('The camera accuracy could not be changed', `${errorText(err)}. Try another setting.`);
    }
    this.set({ busy: false });
  }

  setFocusOnly(focusOnly: boolean): void {
    this.set({ focusOnly });
  }

  /**
   * The Sports menu in the header. Not while judging. A new sport starts a new routine: its moves are
   * scored by other rules, so the two are never mixed in one score.
   */
  setSport(sport: Sport): void {
    if (sport === this.state.sport || this.state.judging) return;
    const showingStart = this.state.message === startMessage(this.state.sport);
    this.recorder.cancel(); // a recording for the other sport's library
    this.set({ sport, live: null, teachRecording: false, teachStatus: '', ...(showingStart ? { message: startMessage(sport) } : {}) });
    this.lastLiveKey = '';
    this.newRoutine();
  }

  private get cheer(): boolean {
    return this.state.sport === 'cheer';
  }

  private get ballet(): boolean {
    return this.state.sport === 'ballet';
  }

  /** Is the athlete in the air (for the sport being judged)? */
  private get airborne(): boolean {
    if (this.cheer) return this.cheerJumps.live.airborne;
    if (this.ballet) return this.jete.live.airborne;
    return this.leap.live.airborne;
  }

  // ---------- Sources ----------

  private async startCamera(): Promise<void> {
    const video = this.video!;
    this.set({ busy: true });
    // Camera first, so the person sees themselves (and gets in position) while the model finishes loading.
    try {
      this.stopSource();
      this.setMessage('Turning on the camera…', 'If your browser asks, allow the camera.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: this.state.facing },
        audio: false,
      });
      video.srcObject = stream;
      video.controls = false;
      await video.play();
      this.set({ source: 'camera', cameraCount: await countCameras() });
      this.onSourceReady();
    } catch (err) {
      console.error(err);
      const blocked = err instanceof DOMException && err.name === 'NotAllowedError';
      this.setMessage(blocked ? 'The camera is blocked' : 'The camera could not start',
        blocked ? 'Allow camera access in your browser, then press the button again.' : errorText(err));
      this.set({ busy: false });
      return;
    }
    await this.loadModelForCamera();
    this.set({ busy: false });
  }

  /** Loads the model while the camera runs. If it fails, the main button becomes "Try loading again". */
  private async loadModelForCamera(): Promise<void> {
    try {
      await this.ensureTracker();
    } catch (err) {
      console.error(err);
      this.setMessage('The pose model could not load', `${errorText(err)}. Check your internet, then press "Try loading again".`);
    }
  }

  /** "Try loading again": the camera is on but the model failed to load. */
  private async retryModel(): Promise<void> {
    this.set({ busy: true });
    await this.loadModelForCamera();
    this.set({ busy: false });
  }

  /** Front <-> back camera. Restarts the camera; not while judging. */
  async switchCamera(): Promise<void> {
    if (this.state.source !== 'camera' || this.state.judging) return;
    this.set({ facing: this.state.facing === 'user' ? 'environment' : 'user' });
    await this.startCamera();
  }

  /** "or use the camera" after a video: drop the video and its results, then turn the camera on. */
  async useCamera(): Promise<void> {
    if (this.state.source !== 'file' || this.state.judging || this.state.busy) return;
    this.newRoutine();
    await this.startCamera();
  }

  async loadFile(file: File): Promise<void> {
    const video = this.video!;
    this.set({ busy: true }); // the model can take a while to load the first time
    try {
      this.stopSource();
      await this.ensureTracker();
      this.setMessage('Opening the video…');
      video.srcObject = null;
      video.src = URL.createObjectURL(file);
      video.controls = true;
      this.fileName = file.name;
      this.set({ source: 'file' });
      await firstFrameReady(video);
      this.onSourceReady();
      this.newRoutine();
      this.setJudging(true); // judge the clip from the start
      await video.play();
    } catch (err) {
      console.error(err);
      this.stopSource(); // don't leave a broken clip on the screen
      this.setMessage('The video could not be opened', errorText(err));
    }
    this.set({ busy: false });
  }

  /** "Try again" on a video: judge the clip again from the start. */
  private replayFile(): void {
    const video = this.video;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  }

  private stopSource(): void {
    const video = this.video;
    if (!video) return;
    const stream = video.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (video.src) URL.revokeObjectURL(video.src);
    video.removeAttribute('src');
    video.srcObject = null;
    // Clear the last skeleton: nothing redraws the overlay without a camera or video.
    const canvas = this.canvas;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    this.set({ source: null, live: null, cards: [], message: startMessage(this.state.sport) });
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
    if (this.cheer) {
      this.cheerJumps.update({ t, lm });
      // In the air the arms belong to the jump, not to a motion.
      this.motions.update({ t, lm, airborne: this.cheerJumps.live.airborne });
    } else if (this.ballet) {
      this.jete.update({ t, lm });
      this.pirouette.update({ t, lm });
      // A retiré that turns is a pirouette, not a balance; nothing in the air is a pose.
      this.balletPoses.update({ t, lm, airborne: this.jete.live.airborne, turning: this.pirouette.live.turning });
    } else {
      this.leap.update({ t, lm });
      this.passe.update({ t, lm, airborne: this.leap.live.airborne });
      this.pivot.update({ t, lm });
      // Turning in an attitude is a pivot, not a balance.
      this.balance.update({ t, lm, airborne: this.leap.live.airborne, turning: this.pivot.live.turning });
    }

    const angles: AnglesFn = this.cheer ? cheerAngles : legAngles;
    const ctx = this.canvas?.getContext('2d');
    if (ctx) {
      drawSkeleton(ctx, lm, this.legColor());
      if (this.anglesVisible) drawLegAngles(ctx, lm, angles);
    }
    // The routine video shows the skeleton and the angles (drawn here if the page hides them).
    if (this.routineRecorder.recording) this.routineRecorder.addFrame(t, video, this.canvas, lm, this.anglesVisible ? null : angles);
    if (this.techVisible) this.updateTech(lm);
    this.updateLive(this.recorder.capture(lm, this.airborne));
    this.countFps();
  }

  private legColor(): string {
    if (this.cheer) {
      if (this.cheerJumps.live.airborne) return '#f08c9c';
      return this.motions.live.shape ? '#4cc38a' : '#7aa7ff'; // green: hitting a motion
    }
    if (this.ballet) {
      if (this.jete.live.airborne) return '#f08c9c';
      return this.balletPoses.live.pose || this.pirouette.live.turning ? '#4cc38a' : '#7aa7ff'; // green: in a pose
    }
    if (this.leap.live.airborne) return '#f08c9c';
    if (this.passe.live.inShape || this.pivot.live.turning || this.balance.live.shape) return '#4cc38a'; // green: in a shape
    return '#7aa7ff';
  }

  /** The box on the video. Only re-renders when what it says changes. */
  private updateLive(teachMessage: string | null): void {
    let live: LiveView;
    if (teachMessage) {
      live = { pose: 'Teaching', showDots: false, dots: 0, tone: 'idle', text: teachMessage };
    } else if (this.cheer) {
      const m = cheerLiveMessage(this.motions.live, this.cheerJumps.live.airborne);
      live = { pose: m.pose ?? 'Watching', showDots: false, dots: 0, tone: m.tone, text: m.text };
    } else if (this.ballet) {
      const turn = this.pirouette.live.turning ? this.pirouette.live.rotationDeg : null;
      const m = balletLiveMessage(this.balletPoses.live, this.jete.live.airborne, turn);
      const holding = Boolean(this.balletPoses.live.pose) && this.balletPoses.live.pose !== 'plie' && turn === null;
      live = { pose: m.pose ?? 'Watching', showDots: holding, dots: m.dots, tone: m.tone, text: m.text };
    } else if (this.pivot.live.turning) {
      const m = pivotMessage(this.pivot.live.rotationDeg);
      live = { pose: m.pose, showDots: false, dots: 0, tone: m.tone, text: m.text };
    } else {
      const m = liveMessage(this.balance.live);
      live = { pose: m.pose ?? 'Watching', showDots: Boolean(m.pose), dots: m.dots, tone: m.tone, text: m.text };
    }
    if (this.state.source === 'file') live = { ...live, text: forVideo(live.text) };
    const key = JSON.stringify(live);
    if (key === this.lastLiveKey) return;
    this.lastLiveKey = key;
    this.set({ live });
  }

  /** Hides the live box (a stopped clip); the next frame that is judged shows it again. */
  private clearLive(): void {
    this.lastLiveKey = '';
    this.set({ live: null });
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

  /** Practice tab: show the leg angles on the video so students see where they are short of 180°. */
  setAnglesVisible(visible: boolean): void {
    this.anglesVisible = visible;
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
    } else if (this.cheer) {
      const { cheerJumps, motions } = this;
      tech = {
        ...EMPTY_TECH,
        fps,
        shape: cheerJumps.live.airborne ? cheerJumps.live.shape ?? 'jump' : motions.live.name ?? '–',
        state: cheerJumps.live.airborne ? 'in the air' : motions.live.shape ? 'motion' : 'on the floor',
      };
    } else if (this.ballet) {
      const { jete, pirouette, balletPoses } = this;
      tech = {
        ...EMPTY_TECH,
        fps,
        shape: pirouette.live.turning ? `pirouette ${Math.round(pirouette.live.rotationDeg)}°` : balletPoses.live.pose ?? '–',
        state: jete.live.airborne ? 'in the air' : pirouette.live.turning ? 'turning' : balletPoses.live.pose ? 'pose' : 'on the floor',
      };
    } else {
      const { leap, passe, balance } = this;
      tech = {
        fps,
        view: legsFullLength(legLengthRatios(lm)) ? 'yes' : 'no',
        split: leap.live.splitDeg == null ? '–' : `${Math.round(leap.live.splitDeg)}°`,
        shape: this.pivot.live.turning ? `attitude turn ${Math.round(this.pivot.live.rotationDeg)}°` : balance.live.label ?? (passe.live.inShape ? 'passé' : '–'),
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
    else if (!this.state.modelReady) void this.retryModel();
    else if (!judging && finished) {
      this.newRoutine();
      this.setJudging(true);
      if (source === 'file') this.replayFile();
    } else this.setJudging(!judging);
  }

  private setJudging(on: boolean, { quiet = false } = {}): void {
    const stopping = !on && this.state.judging;
    if (stopping) {
      this.passe.flush(); // judge a balance (or a motion) still being held
      this.pivot.flush();
      this.balance.flush();
      this.motions.flush();
      this.pirouette.flush();
      this.balletPoses.flush();
      this.stoppedAt = this.currentTimeMs();
      if (this.state.source === 'file') {
        this.video?.pause(); // Finish stops the clip too
        this.clearLive();
      }
    }
    const patch: Partial<SessionState> = { judging: on };
    if (on) {
      patch.finished = false;
      patch.resultsOpen = false;
      if (this.state.source === 'camera' && this.scoreboard.events.length === 0) this.routineStartMs = performance.now();
    }
    this.set(patch);
    if (on && this.video) this.routineRecorder.start(this.video);
    if (stopping && quiet) this.routineRecorder.discard();
    if (stopping && !quiet) {
      this.set({ finished: true });
      this.openResults();
      void this.makeMoveVideos();
    }
  }

  /** "Start over": forget all moves. */
  newRoutine(): void {
    this.scoreboard.reset();
    this.routineStartMs = this.state.source === 'camera' ? performance.now() : 0;
    this.stoppedAt = null;
    this.resetTracking();
    this.forgetMoveVideos();
    this.set({ finished: false, resultsOpen: false, cards: [], scoreVersion: this.state.scoreVersion + 1 });
  }

  private resetTracking(): void {
    this.smoother.reset();
    this.leap.reset();
    this.passe.reset();
    this.pivot.reset();
    this.balance.reset();
    this.cheerJumps.reset();
    this.motions.reset();
    this.balletPoses.reset();
    this.pirouette.reset();
    this.jete.reset();
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

  // ---------- Videos of the moves ----------

  /**
   * After Finish: cuts every move out of the routine recording (video + photo, mistakes marked),
   * shows them in the results and saves them in this browser (lib/recording/clipStore.ts).
   */
  private async makeMoveVideos(): Promise<void> {
    const run = ++this.videoRun;
    const recording = await this.routineRecorder.stop();
    const events = [...this.scoreboard.events].sort((a, b) => a.t - b.t);
    const moves = events; // every move: the ones that lost points, and the correct ones (user, 2026-10-13)
    if (!recording || moves.length === 0) return;
    this.set({ moveVideos: Object.fromEntries(moves.map((e) => [e.id, { status: 'preparing' } as MoveVideo])), videosSaved: null });

    const when = new Date();
    const routineId = `${when.getTime()}`;
    const saved: SavedMove[] = [];
    for (const event of moves) {
      const number = events.indexOf(event) + 1; // same numbers as the report
      const described = describeMove(event);
      let video: MoveVideo = { status: 'failed' };
      const part = clipWindow(event, recording.timeline, recording.durationMs);
      try {
        if (!part) throw new Error('The move is not in the recording');
        const mistakes = event.penalties.map((p) => ({ segment: p.segment, label: mistakeLabel(p) }));
        const media = await cutClip(recording, part, mistakes, described.pointsLost);
        if (run !== this.videoRun) return; // a new routine started meanwhile
        video = {
          status: 'ready',
          clip: media.clip,
          clipUrl: this.keepUrl(media.clip),
          clipName: clipFileName(when, number, described.name, videoExtension(media.clipType)),
          photoUrl: this.keepUrl(media.photo), // the video's cover picture (and what prints)
        };
        saved.push({
          id: `${routineId}-${number}`,
          routineId,
          number,
          name: described.name,
          result: described.result,
          tone: described.tone,
          reasons: described.reasons.map((r) => r.text),
          clip: media.clip,
          clipType: media.clipType,
          photo: media.photo,
        });
      } catch (err) {
        console.warn(`No video for move ${number}`, err);
        if (run !== this.videoRun) return;
      }
      this.set({ moveVideos: { ...this.state.moveVideos, [event.id]: video } });
    }

    if (saved.length === 0) return;
    const pointsLost = this.scoreboard.compute({}).breakdown.autoE;
    const ok = await saveRoutine({ id: routineId, createdAt: when.getTime(), pointsLost, videos: saved.length }, saved);
    if (run === this.videoRun) this.set({ videosSaved: ok });
  }

  private keepUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.videoUrls.push(url);
    return url;
  }

  /** Drops the videos shown in the results (saved ones stay in the browser) and stops recording. */
  private forgetMoveVideos(): void {
    this.videoRun++;
    this.routineRecorder.discard();
    this.videoUrls.forEach((url) => URL.revokeObjectURL(url));
    this.videoUrls = [];
    if (Object.keys(this.state.moveVideos).length > 0 || this.state.videosSaved !== null) {
      this.set({ moveVideos: {}, videosSaved: null });
    }
  }

  // ---------- Teach poses ----------

  /** Record 3 s: needs a running camera or video, and not while judging. */
  startTeachRecording(label: string): void {
    const kit = teachKitFor(this.state.sport);
    if (!kit) return; // this sport has no pose library
    if (this.state.source === null || this.state.judging) {
      this.set({ teachStatus: 'Start the camera first, and stop judging while you teach.' });
      return;
    }
    if (!this.state.modelReady) {
      this.set({ teachStatus: 'Wait until the pose model has loaded, then record.' });
      return;
    }
    this.recorder.start(kit, label);
    this.set({ teachRecording: true });
  }

  private finishTeachRecording(kit: TeachKit, label: string, signatures: number[][]): void {
    this.set({ teachRecording: false });
    if (signatures.length === 0) {
      this.set({ teachStatus: 'Nothing recorded: the whole body and both feet must be in view.' });
      return;
    }
    const saved = kit.store.teach(label, signatures);
    this.libraryChanged(`Added ${signatures.length} examples of ${kit.names[label]}.${saved ? '' : ' (Not saved in this browser: they last until you close the page.)'}`);
  }

  /** Taught poses changed: use them right away and show a message. */
  libraryChanged(message: string): void {
    this.loadLibraries();
    this.set({ teachStatus: message });
  }

  /** Every sport's pose library: shipped examples + the ones taught in this browser. */
  private loadLibraries(): void {
    setPoseLibrary(gymnasticsLibrary.currentLibrary());
    setBalletLibrary(balletLibrary.currentLibrary());
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
      sport: this.state.sport,
      ruleSource: this.cheer ? CHEER_RULE_SOURCE : this.ballet ? BALLET_RULE_SOURCE : RULE_SOURCE,
      source: this.state.source === 'file' ? `file: ${this.fileName}` : this.state.source,
      poseModel: `MediaPipe Pose Landmarker (${this.trackerVariant}, ${this.tracker?.delegate})`,
    });
    downloadFile(`rhymnast-record-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(audit, null, 2), 'application/json');
  }
}

/** Number of cameras (labels and ids need permission, but the count is known once the camera runs). */
async function countCameras(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length;
  } catch {
    return 1;
  }
}

/** Waits for the first frame of a clip. Fails if the browser can't play the file. */
function firstFrameReady(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const stopListening = () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
    };
    const onLoaded = () => {
      stopListening();
      resolve();
    };
    const onError = () => {
      stopListening();
      reject(new Error('This browser cannot play this video file. Try an MP4 file'));
    };
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);
  });
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

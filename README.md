# Rhymnast: AI judging assistant for rhythmic gymnastics, cheerleading and ballet

Three sports, picked in the header (**Sports** menu; rhythmic gymnastics until one is picked). Each has its
own look (colors, heading font) and its own moves. Cheerleading: [`docs/cheer.md`](docs/cheer.md); ballet:
[`docs/ballet.md`](docs/ballet.md); the rest of this page is about rhythmic gymnastics.

A gymnast performs in front of a camera. A **pretrained pose model** (Google MediaPipe Pose, in the
browser) finds her joints in every frame. **Rules from the FIG Code of Points** measure the shapes
(e.g. "split leap needs 180° at the highest point") and suggest **Difficulty (D)** values and
**Execution (E)** deductions in real time. Human judges enter **Artistry (A)** and can reject any AI call.

> Decision support, not a replacement for judges. Every call shows the measured angle, the rule and
> page it comes from, and a confidence, and can be rejected. Export the audit log as JSON.

## Live demo

**Live URL: https://rhymnast.pages.dev** (Cloudflare Pages, from `main`). Deploys are manual:
run `npm run deploy` (builds the static site into `out/` and uploads it; log in once with
`npx wrangler@4.151.0 login`). GitHub Actions runs the type
check, lint and tests. The first visit downloads the pose model (30 MB) and its runtime (9 MB) in
the background while the page is open. Video stays on your device.

## Run it locally

Requires Node.js 20 or newer and Chrome, Edge or Safari. Internet is needed on first load: the pose
model is downloaded from Google's CDN (the default "Heavy" model is 30 MB). It starts downloading as
soon as the page opens, so "Turn on camera" is quick, and is kept in the browser's Cache Storage, so it
downloads only once (`lib/modelCache.ts`; skipped when the browser asks to save data). If the video looks slow, choose "Faster" under Settings → Camera accuracy.

```sh
npm install
cp .env.example .env   # then fill in the four Firebase values (Firebase console → Project settings → Your apps)
npm run dev
```

The first screen is **Sign in** at `/login` (Firebase Authentication: email and password, with
**Forgot password?**) or **Create account** at `/signup` (name, email and password). Both also offer
**Continue with Google** and **Try without an account** (one click, for demos). A guest has no Sign out:
the header shows **Sign in** instead. After signing in you go back to the page you opened.
The camera stays off until you are signed in. The Firebase web settings are not committed: `.env.example`
lists them, and `.env` / `.env.local` hold them on your computer (git-ignored). `npm run deploy` builds
them into the site from there.

Open <http://localhost:3000>, then:

1. Pick a tab at the top: **Practice** (gymnast / coach) or **Judge**.
2. Press **Turn on camera** and allow access (or **or use a video** for a recorded routine).
   After a video has been judged, **or use the camera** goes back to the camera and **Use another
   video** judges the next clip.
   The camera starts at once; if the pose model is still downloading, the video shows how far it is
   ("40%") and judging can start when it is done.
   On a phone or tablet, **Switch camera** uses the back camera to film someone else.
   **Full screen** (button on the video) shows the video, skeleton and boxes on the whole screen, with
   Start / Finish on it; **Exit full screen** or Esc leaves, and Finish leaves by itself so the results
   show. On iPhone Safari, which can't put a page part in full screen, the video covers the page instead.
   A phone turned sideways works too: the video fits the screen height (the page scrolls to it when
   the camera starts), Start / Finish is on the video, and the boxes on it are the small phone ones.
3. Stand **sideways** to the camera, whole body and both feet in the picture.
4. Press **Start** and hold each balance for at least 1 second (or do a stag leap or an attitude turn). The box on the video shows the balance
   it sees, four dots that fill up in one second, and "Looks good" or one tip ("Open the split more
   (−0.10)"). After each move a card shows what it cost.
5. Press **Finish** to see the results: "You did 3 moves. Points lost: 0.40" with a reason and a
   tip for every move. **Show rulebook details** adds the codes, measurements and rule quotes.
   In the **Judge** tab, enter Artistry and penalties, press Agree / Disagree on each call, and get
   the final score.
   Every move gets a **short video** (1 s before to 1 s after the move, with the skeleton and leg
   angles); a correct move is marked green. While a move that lost points is held, the body part is **red** with a
   tag ("Thigh 6° low −0.10"), a badge says "Points lost here", and a strip along the top shows
   when it happens. **Download video** saves it. In **Practice** (rhythmic gymnastics), a balance that lost
   points also shows **How it should look**: a short clip of the same balance done right (`lib/reference.ts`).
   They are kept in this browser (IndexedDB, newest 10 routines; nothing is uploaded) and listed on
   **Saved videos** (`/saved`, also linked from Settings).
6. **Settings** holds everything else: camera accuracy, judging all moves, Teach poses, saved videos,
   downloading the record, technical details and the developer tools.

The camera only works on `localhost` or HTTPS (browser rule). To use it from another device, use the
live site (HTTPS). Every page is static: `npm run build` writes the whole site to `out/`.

## Competition mode

**Competition** in the navbar runs a rhythmic gymnastics competition with one or more human judges on
their phones (details: [docs/competition.md](docs/competition.md)):

1. The organizer creates a competition and shows the **QR code**. Each judge scans it with the phone
   camera, signs in (or **Try without an account**) and joins; each gets one role: **Difficulty (D)**,
   **Artistry (A)** or **Execution (E)**. Participants are "Participant 1, 2, …" until renamed.
2. **Start competition**, then **Start** each participant (the app asks first). The AI camera judges
   the routine; the judges' phones show the participant and the AI's suggestions live (one tap adds one
   to their sheet), next to big quick buttons. No video on the phones.
3. **Finish performance**: the judges send their scores. The organizer sees who has sent, enters
   penalties and saves the result: Final = D + A + E − penalties (with several judges per role, the
   average; with 4 or more, highest and lowest left out).
4. **Leaderboard ↗** opens the spectators' screen (totals only, live, full screen). The organizer's
   list opens each result's breakdown: every judge's score and sheet.

The data goes through **Firestore** in the same Firebase project; who may read or write what is in
[`firestore.rules`](firestore.rules) (paste it in Firebase console → Firestore → Rules after a change).

## What it judges

| Element | Code | D value | Automated E deductions |
|---|---|---|---|
| Split leap | 1.2103 | 0.30 | Shape deviation from 180°: ≤10° −0.10, 11–20° −0.30, >20° −0.50 and DB not valid |
| Passé balance | 2.101 | 0.10 (−0.10 on flat foot) | Thigh below horizontal (same bands); held < 1 s −0.30 |
| Passé pivot | 3.101 | 0.10 + 0.10 per extra 360° | Thigh below horizontal (same bands); < 360° not valid |
| **Front split balance with help** | 2.303 | 0.30 (without help: 2.305, 0.50) | Split short of 180° (bands); held < 1 s −0.30; flat foot −0.10 |
| **Back split balance without help** | 2.1005 | 0.50 | Whole foot not above the head (bands, in degrees); held < 1 s −0.30; flat foot −0.10 |
| **Back split balance, trunk forward** | 2.1104 | 0.40 | Split short of 180° and trunk above horizontal, each its own band; held < 1 s −0.30; flat foot −0.10 |
| **Attitude balance** | 2.1202 | 0.20 | Thigh below horizontal and trunk leaning more than 20°, each its own band; held < 1 s −0.30; flat foot −0.10 |
| **Arabesque balance** | 2.902 | 0.20 | Thigh below horizontal and trunk leaning more than 20°, each its own band; held < 1 s −0.30; flat foot −0.10 |
| **Stag leap** | 1.2702 | 0.20 | Front thigh to back leg short of 180° (bands); front knee bend left to judges |
| **Attitude pivot** | 3.1203 | 0.30 + 0.20 per extra 360° | Thigh below horizontal (bands); < 360° not valid (15° rotation margin); trunk and relevé left to judges |

Every D value was checked against the pictograms in the CoP tables (p. 80 jumps, p. 88-89 balances,
p. 100 rotations) on 2026-10-13. The 20° natural trunk lean is a team decision, not a Code value
(see `docs/rules.md`).

Scoring follows the Code: **Final = D + A + E − penalties**, highest 8 body difficulties count, a
repeated difficulty counts once but its execution faults are still deducted.
Rule text, page numbers and how each value was checked: [`docs/rules.md`](docs/rules.md).

**Not automated** (judges add these by hand): apparatus difficulties (DA), R elements, dance steps,
apparatus handling faults, artistry, other body difficulties.

**Cheerleading** (`lib/cheer/`): 5 jumps (toe touch, pike, herkie, tuck, spread eagle) and 8 arm motions
(High V, Low V, T, touchdown, diagonal, L motion, punch, broken T), judged with a team-made technique
rubric (not an official score sheet). See [`docs/cheer.md`](docs/cheer.md).

**Ballet** (`lib/ballet/`): six poses recognized by a ballet pose library (arabesque, attitude, développé
devant, à la seconde, retiré, plié), the pirouette (turns counted) and the grand jeté, judged with a
team-made technique rubric. See [`docs/ballet.md`](docs/ballet.md).

## How it recognizes the poses (no model training)
The pose model (MediaPipe, pretrained by Google) finds the body joints. Our code turns each frame into a
**pose signature** (body angles that don't depend on size, distance or facing direction) and compares it
with a **pose library** of labeled examples: ~1,000 shipped with the app plus the ones your team teaches.
The nearest examples decide which pose it is. The **deduction** is then measured with the rulebook
geometry, so it can always be explained with the Code of Points. Details: `docs/rules.md`.

## Known limits

- **One camera = 2D angles.** Splits are measured correctly only when the camera is side-on to the
  split. If a leg points toward the camera it looks shorter; the app detects this and warns
  ("leg foreshortened, angle unreliable").
- MediaPipe sometimes **misses unusual poses** (deep back bends, inverted shapes). Those frames are not
  scored. In our photo checks it found 4 of 6 competition gymnasts.
- Pivot rotations are counted from how wide the body looks (±45°). Relevé is not checked during pivots.
- Deductions start after a **3° camera margin** (the camera can't measure more precisely); see
  `docs/rules.md` → "Fair judging".
- Dark clothes in front of a dark background make the pose model unsure about the raised leg. The app
  still uses the leg when its shape is plausible and marks the call "low confidence". Best results:
  plain, light background and clothes that contrast with it.
- The Code says angle limits are "a guideline" for judges. The app shows the measurement and a
  suggested band; judges decide.
- Validated so far on synthetic skeletons (unit tests) and competition photos, **not yet on judged
  video**. See PLAN.md Phase 4.

## Project layout

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4. The judging logic in `lib/` is plain
TypeScript with no React in it, so it can be tested without a browser.

```
app/
  layout.tsx                 root layout; <AuthProvider> knows who is signed in on every page
  (auth)/layout.tsx          sign-in pages; someone already signed in goes straight on
  (auth)/login/page.tsx      /login: sign in (and "Forgot password?")
  (auth)/signup/page.tsx     /signup: create an account
  (app)/layout.tsx           pages that need sign-in (the "(app)" folder is not part of the URL)
  (app)/page.tsx             the judging page (renders components/RhymnastApp.tsx)
  (app)/tools/*/page.tsx     developer tools: image-check, validate, video-analyze
  (app)/compete/page.tsx     competition mode, organizer: /compete (list) and /compete?c=<id>
  (app)/compete/board/       the spectators' leaderboard: /compete/board?c=<id>
  (app)/judge/page.tsx       competition mode, judge (from the QR code): /judge?c=<id>&k=<key>
  globals.css                Tailwind theme: colors, font, card animation
components/
  RhymnastApp.tsx            page layout: header, video, controls, side panels, results, settings
  useJudgingSession.ts       connects React to lib/session.ts
  Stage.tsx                  video + skeleton overlay, live box, move cards, full screen (useFullscreen.ts)
  SidePanels.tsx             Practice and Judge panels;  MoveRow.tsx: one move in a list
  ResultsView.tsx            results after Finish (plain words, optional rulebook details)
  MoveMedia.tsx              video (mistakes marked) and download of one move
  SavedVideos.tsx            the Saved videos page (app/(app)/saved): delete one routine or all
  SettingsDrawer.tsx         camera accuracy, focus mode, Teach poses, record download, tech details
  ui.ts                      shared Tailwind classes for buttons, inputs and colors
  auth/                      sign-in UI: AuthProvider (useAuth), RequireAuth, AuthScreen, SignInForm,
                             SignUpForm, ResetPasswordForm, OtherSignInOptions (Google, guest),
                             Fields, AccountButton
  tools/                     the three developer tools
  competition/               competition mode: Lobby (QR, judges, participants), Running (camera,
                             one participant at a time, scoring), ScoreSheet (judge's phone),
                             Leaderboard, ParticipantDetail (breakdown), JudgePage
lib/
  firebase/                  Firebase web config check, browser Auth + Firestore client, sign-in actions
                             (auth.ts), competition data (competition.ts)
  competition/               competition mode logic: panel scoring, judge sheet, AI live suggestions,
                             join link + QR, leaderboard order
  session.ts                 wiring: video -> pose -> smoothing -> detectors -> scoreboard (browser)
  pose.ts                    MediaPipe Pose Landmarker (pretrained, pinned version)
  geometry.ts                angles on landmarks (split, thigh elevation, leg foreshortening)
  oneEuro.ts                 jitter filter for landmarks
  rules.ts                   Code of Points values, each with a page reference
  elements/splitLeap.ts      leap state machine + 180° rule
  elements/passe.ts          passé balance (1 s hold, relevé) and pivot (rotation count)
  elements/balances.ts       the 3 focus balances: recognition + rulebook deductions
  library/                   pose signature, nearest-neighbour library, default examples (JSON)
  library/examples/          synthetic skeletons + real-photo landmarks: used by the tests AND
                             to build the default library (changing them changes the app)
  scoring.ts                 D / E / A / final, top-8, repetitions, judge overrides, audit export
  report.ts                  end-of-routine deduction report (data)
  ui/plain.ts                plain-language texts and tips (keep new UI text in this style)
  tools/                     photo / video analysis used by the developer tools
  recording/                 move videos: record the routine while judging, cut out every move with
                             mistakes marked (annotate.ts), save in IndexedDB (newest 10)
tests/                       unit tests (vitest)
scripts/build-library.ts     regenerates lib/library/defaultLibrary.json
docs/rules.md                rules we automate, quoted from the Code with page numbers
docs/competition.md          competition mode: flow, roles, how the result is made, Firestore setup
firestore.rules              who may read and write what in competition mode (paste into Firebase)
data/README.md               where to get clips and datasets (nothing in data/ is committed)
```

## Tests

```sh
npm test              # unit tests (vitest)
npm run typecheck     # TypeScript
npm run lint          # ESLint
```

To check a rule on a real photo, open <http://localhost:3000/tools/image-check> and pick an image
(e.g. the peak frame of a leap).

To check many labeled photos at once (e.g. a teammate's attitudes), follow "Validation photos" in
`data/README.md` and open <http://localhost:3000/tools/validate>. Nothing is trained: the photos
show whether the rules agree with a judge, and their landmarks (no images) become unit tests: save
"Export keypoints (tests)" as `lib/library/examples/real-balances.json`, then run `npm run build-library`.

To see what the app recognizes in a recorded routine, frame by frame, open
<http://localhost:3000/tools/video-analyze>.

To make a "How it should look" clip (skeleton drawn on it, 16:9), open
<http://localhost:3000/tools/reference-video> (see "Reference videos" in `data/README.md`).

## Adding an element

1. Quote the rule and value from the Code of Points in `docs/rules.md` with the page number.
2. Add its values to `ELEMENTS` in `lib/rules.ts`.
3. Write a detector in `lib/elements/` with an `update({ t, lm })` method that calls
   `onEvent(event)`. The event shape is `ElementEvent` in `lib/types.ts`; copy `judgeSplitLeap`
   in `splitLeap.ts`.
4. Add synthetic-pose tests in `tests/` (any `*.test.ts` file is picked up).
5. Wire it in `lib/session.ts` next to the other detectors.

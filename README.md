# Rhymnast: AI judging assistant for rhythmic gymnastics

A gymnast performs in front of a camera. A **pretrained pose model** (Google MediaPipe Pose, in the
browser) finds her joints in every frame. **Rules from the FIG Code of Points** measure the shapes
(e.g. "split leap needs 180° at the highest point") and suggest **Difficulty (D)** values and
**Execution (E)** deductions in real time. Human judges enter **Artistry (A)** and can reject any AI call.

> Decision support, not a replacement for judges. Every call shows the measured angle, the rule and
> page it comes from, and a confidence, and can be rejected. Export the audit log as JSON.

## Live demo

**Live URL: https://pinequest-s5-episode-1-team-6.vercel.app** (from `main`). Deploys are manual:
run `npm run deploy` (Vercel CLI; log in once with `npx vercel login`). GitHub Actions runs the type
check, lint and tests. The first load downloads the pose model
(about 10 MB). Video stays on your device.

## Run it locally

Requires Node.js 20 or newer and Chrome, Edge or Safari. Internet is needed on first load: the pose
model is downloaded from Google's CDN (the default "Heavy" model is 30 MB, about 30 s the first time;
the browser keeps it afterwards). If the video looks slow, choose "Faster" under Settings → Camera accuracy.

```sh
npm install
npm run dev
```

The first screen is **Sign in** / **Create account** (Firebase Authentication, email and password),
**Continue with Google**, or **Try without an account** (one click, for demos).
The camera stays off until you are signed in. The Firebase web settings are public and committed in
`.env`; to use another Firebase project on your computer, put the same names in `.env.local`.

Open <http://localhost:3000>, then:

1. Pick a tab at the top: **Practice** (gymnast / coach) or **Judge**.
2. Press **Turn on camera** and allow access (or **or use a video** for a recorded routine).
   On a phone or tablet, **Switch camera** uses the back camera to film someone else.
3. Stand **sideways** to the camera, whole body and both feet in the picture.
4. Press **Start** and hold each balance for at least 1 second. The box on the video shows the balance
   it sees, four dots that fill up in one second, and "Looks good" or one tip ("Open the split more
   (−0.10)"). After each move a card shows what it cost.
5. Press **Finish** to see the results: "You did 3 balances. Points lost: 0.40" with a reason and a
   tip for every move. **Show rulebook details** adds the codes, measurements and rule quotes.
   In the **Judge** tab, enter Artistry and penalties, press Agree / Disagree on each call, and get
   the final score.
6. **Settings** holds everything else: camera accuracy, judging all moves, Teach poses, downloading
   the record, technical details and the developer tools.

The camera only works on `localhost` or HTTPS (browser rule). To use it from another device, use the
Vercel deploy (HTTPS). Every page is static: `npm run build` prerenders them all.

## What it judges

| Element | Code | D value | Automated E deductions |
|---|---|---|---|
| Split leap | 1.2103 | 0.30 | Shape deviation from 180°: ≤10° −0.10, 11–20° −0.30, >20° −0.50 and DB not valid |
| Passé balance | 2.101 | 0.10 (−0.10 on flat foot) | Thigh below horizontal (same bands); held < 1 s −0.30 |
| Passé pivot | 3.101 | 0.10 + 0.10 per extra 360° | Thigh below horizontal (same bands); < 360° not valid |
| **Front split balance with help** | 2.303 | 0.30 ⚠️ (without help: 2.305, 0.50 ⚠️) | Split short of 180° (bands); held < 1 s −0.30; flat foot −0.10 |
| **Back split balance without help** | 2.1005 | 0.50 ⚠️ | Whole foot not above the head (bands, in degrees); held < 1 s −0.30; flat foot −0.10 |
| **Back split balance, trunk forward** | 2.1104 | 0.40 ⚠️ | Split short of 180° and trunk above horizontal, each its own band; held < 1 s −0.30; flat foot −0.10 |
| **Attitude balance** | 2.1202 | 0.20 ⚠️ | Thigh below horizontal and trunk not vertical, each its own band; held < 1 s −0.30; flat foot −0.10 |

⚠️ = balance value read from the table by row order; a teammate must confirm it against the
pictograms on CoP p. 88-89 (see `docs/rules.md`).

Scoring follows the Code: **Final = D + A + E − penalties**, highest 8 body difficulties count, a
repeated difficulty counts once but its execution faults are still deducted.
Rule text, page numbers and how each value was checked: [`docs/rules.md`](docs/rules.md).

**Not automated** (judges add these by hand): apparatus difficulties (DA), R elements, dance steps,
apparatus handling faults, artistry, other body difficulties.

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
  page.tsx                   the judging page (renders components/RhymnastApp.tsx)
  tools/*/page.tsx           developer tools: image-check, validate, video-analyze
  globals.css                Tailwind theme: colors, font, card animation
components/
  RhymnastApp.tsx            page layout: header, video, controls, side panels, results, settings
  useJudgingSession.ts       connects React to lib/session.ts
  Stage.tsx                  video + skeleton overlay, live box, move cards
  SidePanels.tsx             Practice and Judge panels;  MoveRow.tsx: one move in a list
  ResultsView.tsx            results after Finish (plain words, optional rulebook details)
  SettingsDrawer.tsx         camera accuracy, focus mode, Teach poses, record download, tech details
  ui.ts                      shared Tailwind classes for buttons, inputs and colors
  AuthGate.tsx               email, Google or guest sign-in (Firebase Auth) in front of every page
  tools/                     the three developer tools
lib/
  firebase/                  Firebase web config check and browser Auth client
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
tests/                       unit tests (vitest)
scripts/build-library.ts     regenerates lib/library/defaultLibrary.json
docs/rules.md                rules we automate, quoted from the Code with page numbers
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

## Adding an element

1. Quote the rule and value from the Code of Points in `docs/rules.md` with the page number.
2. Add its values to `ELEMENTS` in `lib/rules.ts`.
3. Write a detector in `lib/elements/` with an `update({ t, lm })` method that calls
   `onEvent(event)`. The event shape is `ElementEvent` in `lib/types.ts`; copy `judgeSplitLeap`
   in `splitLeap.ts`.
4. Add synthetic-pose tests in `tests/` (any `*.test.ts` file is picked up).
5. Wire it in `lib/session.ts` next to the other detectors.

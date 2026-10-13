# Project: Rhythmic Gymnastics AI Judging Assistant (PineQuest entry)

## What we're building
A real-time computer-vision web app for **rhythmic gymnastics**. A gymnast performs in front of a camera.
The system scores **Technical Difficulty (D)** and **Execution (E)**. Human judges score **Artistry and
facial expression** in a separate judge panel. The app combines them into a final score.
Positioning: *decision support that flags measurable deductions judges can miss, with an audit trail*, not a judge replacement.

## Constraints
- 2-week build, team of 5 junior engineers. Keep scope small and demo-able.
- **Use pretrained models only. Do not train from scratch.** Integrate, don't research.
- No judge-scored video of our own. Public data only (RG dataset, public competition videos).
- Real time = roughly 15-30 FPS on a laptop webcam.
- Possibly open-sourced later and pitched to Y Combinator: keep the code clean and documented.

## Architecture (hybrid)
| Layer | Tool | When |
|---|---|---|
| Skeleton tracking | Pretrained pose model (MediaPipe Pose in browser, or RTMPose/YOLO-pose on a Python backend) | Live, per frame |
| Element + deduction flags | Small rule set on keypoints (split angle, balance height, supporting-leg bend, landing) | Live |
| ~~Overall execution estimate~~ | ~~AQA model (CoFInAl / CaFlow)~~: dropped, see Decisions | n/a |
| Artistry / expression | Human judge panel UI | Manual |

Known limits (be honest in the UI and README):
- AQA research models score a whole routine after it ends (~1.5 min videos), usually one model per apparatus, and output a number with no per-deduction explanation. They are NOT live.
- CoFInAl / CaFlow weights were checked on 2026-10-08: not usable (see Decisions).
- Start body-only (jumps, balances, pivots). Apparatus tracking (ribbon, ball) is a stretch goal.
- Automate only deductions that are measurable. Do not claim to match human scores.

## Reference repos / data
- CoFInAl: github.com/ZhouKanglei/CoFInAl_AQA
- CaFlow: github.com/Harrison21/CaFlow
- RG dataset: 1000 videos, 4 apparatus (ball, clubs, hoop, ribbon), with difficulty / execution / total scores. Check licensing before redistributing.
- Fujitsu + FIG Judging Support System covers artistic gymnastics and is proprietary. It is useful for pitch context only.

## Working rules for Claude Code
- Build in small steps. Do not generate the whole app at once. Finish and test one step, then commit.
- Before writing code, state the plan for the step in a few lines and wait for approval on anything ambiguous.
- Keep this file and PLAN.md up to date as decisions change.
- Prefer simple, readable code over clever code. The team is junior.
- Never commit videos, model weights or datasets. Use .gitignore and a `data/README.md` explaining how to download them.

## Decisions (made 2026-10-08)
1. **Pose inference: in the browser** with MediaPipe Pose Landmarker (`@mediapipe/tasks-vision@0.10.14`,
   pinned in package.json; WASM and model weights from pinned CDN URLs). No backend. The judging page
   preloads the model when it opens and keeps it in Cache Storage (`lib/modelCache.ts`, 2026-10-13):
   Google serves the weights with only a 1-hour browser cache.
   Frontend: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4** (user, 2026-10-12; replaces
   the plain-JS `web/` app of 2026-10-08, kept in the old Rhymnast repo). Judging logic is plain
   TypeScript in `lib/` with no React in it; UI in `components/` (client components) and `app/`.
   Package manager: **npm** (`package-lock.json`; bun dropped 2026-10-12). Run `npm run dev`. Tests: `npm test` (vitest), types: `npm run typecheck`.
   This Next.js version has breaking changes: read `AGENTS.md` and `node_modules/next/dist/docs/` first.
2. **Focus elements (user, 2026-10-08): three BALANCES** (not pivots): front split with help (2.303),
   back split without help with trunk upright = "whole foot above the head" (2.1005), attitude (2.1202).
   Code: `lib/elements/balances.ts`. Their D values are mapped by row order and still need a human
   check against the CoP pictograms (p. 88-89). Also built earlier: split leap, passé balance/pivot.
   Ring jump/balance is a stretch goal (hard to measure from one 2D camera).
3. **AQA layer dropped** for the 2-week build. Findings from the Phase 0 repo check:
   - CoFInAl: only one checkpoint (`Ball_best.pkl`), trained on Total score (not E), Spearman ≈ 0.81.
     Needs pre-extracted Video Swin-B features (mmaction2), offline only. No license.
   - CaFlow: no trained weights at all; you must train it yourself. No license.

4. **Hosting: Vercel (Hobby plan), repo private.** GitHub Pages dropped when the repo went private.
   Vercel builds the Next.js app with its defaults (no `vercel.json` needed). Deploys are manual
   (user, 2026-10-13): `npm run deploy` (Vercel CLI). Auto-deploy needs a pinecone-studio org owner
   (Vercel GitHub app or GitHub Actions), so it was dropped. Live: https://pinequest-s5-episode-1-team-6.vercel.app
   Hobby is non-commercial: move to Vercel Pro once the startup uses it commercially.
5. **No open-source license for now.** The team plans a startup; decide licensing later.
6. **Pose recognition by example (user, 2026-10-08):** a pose library (nearest neighbours over a
   10-number pose signature, `lib/library/`) decides WHICH balance it is; rulebook geometry decides
   the deduction. Default examples are generated by `npm run build-library` (rebuild after changing
   `signature.ts`, `balanceFrame.ts` or `lib/library/examples/poses.ts`); teams add their own in the app ("Teach poses"). No neural-net
   training, in line with "pretrained models only".
7. **Videos from the team (2026-10-09):** `data/validation/videos/` (git-ignored). Findings: the pose
   model places the raised leg correctly but with low confidence (dark leggings on a dark background),
   so a plausible-leg check replaces the hard 50% gate; the team's back split is the trunk-forward one
   (row 11, 2.1104), now supported; default model is Heavy. Fair judging: 3° camera margin, one hold =
   one judgment (see docs/rules.md).
8. **Simple UI (judges' review, 2026-10-09):** "too professional, hard to understand". The main screens
   use plain words only (no codes, no D/E/A jargon in Practice); two tabs, Practice and Judge; one main
   button; plain texts live in `lib/ui/plain.ts`. Keep new UI text in that style.
9. **Sign-in (user, 2026-10-12):** Firebase Authentication, email and password, Google (popup) or
   "Try without an account" (Firebase Anonymous, for demos; a guest sees Sign in in the header instead
   of Sign out, and may open /login and /signup), in the browser
   (`firebase` client SDK, no backend). Sign in (`/login`) and Create account (`/signup`) are their own pages in
   `app/(auth)/`; every other page
   lives in the route group `app/(app)/`, whose layout (`components/auth/RequireAuth.tsx`) sends people who
   are not signed in to `/login?next=...` (2026-10-13). Who is signed in: `useAuth()` from
   `components/auth/AuthProvider.tsx` (root layout). Firebase calls live in `lib/firebase/auth.ts` (no React).
   Sign-up asks for a name; "Forgot password?" sends Firebase's reset email; closing the Google window
   shows no error. The four public web settings (`NEXT_PUBLIC_FIREBASE_*`) are NOT committed (user, 2026-10-13;
   they were committed in `.env` before): `.env.example` lists the names, each computer copies it to
   `.env` (or `.env.local`), and Vercel has them under Project → Settings → Environment Variables.
   `.env*` is git-ignored except `.env.example`. Never commit server secrets
   (service account keys, `firebase-admin`). Email/Password, Google and Anonymous are on in the Firebase console;
   Google on the live site also needs the Vercel domain under Authentication → Settings → Authorized domains.
10. **Move videos (user, 2026-10-13):** while judging, the routine is recorded (video + skeleton + leg
   angles, `lib/recording/routineRecorder.ts`). After Finish, every move is cut out (also correct ones, marked green; user 2026-10-13),
   1 s before to 1 s after the move (`clipCutter.ts`), with a photo from the middle of the hold as its
   cover. While the move is held, the video marks the mistake (`annotate.ts`, user 2026-10-13): the body
   part in red with a tag, a "Points lost here" badge, a strip along the top showing when. The results show the video
   and Download video (no Watch / Download photo buttons, user 2026-10-13). Saved in IndexedDB (localStorage is too
   small), newest 10 routines, on the Saved videos page (`/saved`). Nothing is uploaded.

10. **Next three elements (user, 2026-10-13):** arabesque balance, attitude pivot, stag leap (jump with
   front leg folded, back leg stretched). Order: arabesque (reuses attitude code), stag leap (reuses
   `splitLeap.ts`), attitude pivot (attitude shape + turn counter from `passe.ts`; riskiest, the shape is
   only side-on for part of each turn). Team videos go in `data/validation/videos/<element>/` (see
   `data/README.md`). CoP codes and D values need a human check before they go into `lib/rules.ts`.
   **Built 2026-10-13** (branch `15-new-elements`): arabesque 2.902 (0.20) in `balances.ts`; stag leap
   1.2702 (0.20) in `splitLeap.ts` (the leap detector decides split vs stag); attitude pivot 3.1203
   (0.30, +0.20 per extra turn) in `attitudePivot.ts`. Values checked on the pictograms (decision 12).
   Pivot rotation = facing angle from the shoulders' left/right order + nose offset (the old body-width
   method counted 180° for a full turn), plus one frame of turning as sampling margin.
   The team's clips replay as tests: `npm run replay`, `tests/videos.test.ts` (body points only).

## How scoring works
The pretrained pose model gives body joints. **Our own rules** measure angles on those joints and compare
them with the FIG Code of Points. Example: split leap needs a 180° split at the highest point. Deviation
≤10° = 0.10 E penalty, 11-20° = 0.30, >20° = 0.50 and the difficulty is not valid. See `docs/rules.md`.
Rule values live in data with a CoP page reference (`lib/rules.ts`), never as magic numbers in code.

**2D limit:** one camera measures angles in the image plane. A split angle is only reliable when the camera
is side-on to the split. We detect this from **leg foreshortening** (each leg should look ~1.8-2.1 torso
lengths), not body width: gymnasts open shoulders/hips to the audience even when the legs are side-on.
Show warnings in the UI and skip low-visibility frames.

11. **Natural trunk lean (user, 2026-10-13):** in arabesque and attitude the first 20° of trunk lean are
   not a deviation (`NATURAL_TRUNK_LEAN_DEG`, `lib/rules.ts`); only the lean beyond goes into the bands.
   A team decision: the Code gives no angle for "maximum vertical position of the body".
12. **D values checked on the pictograms (2026-10-13):** every code the app uses was checked on the
   rendered CoP table pages (p. 80, 88-89, 100); all `verified: true`.

## Open decisions (ask the user before assuming)
- None right now.

See PLAN.md for the phased build order.

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
   pinned in package.json; WASM and model weights from pinned CDN URLs). No backend.
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
   Vercel builds the Next.js app with its defaults (no `vercel.json` needed).
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
9. **Sign-in (user, 2026-10-12):** Firebase Authentication, email and password, in the browser
   (`firebase` client SDK, no backend). The app stays behind `components/AuthGate.tsx` until someone
   is signed in. Public web settings live in `.env.local` (`NEXT_PUBLIC_FIREBASE_*`, see `.env.example`);
   never commit them. Turn on Email/Password in the Firebase console.

## How scoring works
The pretrained pose model gives body joints. **Our own rules** measure angles on those joints and compare
them with the FIG Code of Points. Example: split leap needs a 180° split at the highest point. Deviation
≤10° = 0.10 E penalty, 11-20° = 0.30, >20° = 0.50 and the difficulty is not valid. See `docs/rules.md`.
Rule values live in data with a CoP page reference (`lib/rules.ts`), never as magic numbers in code.

**2D limit:** one camera measures angles in the image plane. A split angle is only reliable when the camera
is side-on to the split. We detect this from **leg foreshortening** (each leg should look ~1.8-2.1 torso
lengths), not body width: gymnasts open shoulders/hips to the audience even when the legs are side-on.
Show warnings in the UI and skip low-visibility frames.

## Open decisions (ask the user before assuming)
- None right now.

See PLAN.md for the phased build order.

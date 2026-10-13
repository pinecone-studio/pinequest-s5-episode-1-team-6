# Build plan (2 weeks)

## Phase 0 - Verify (Day 1)
- [x] Inspect CoFInAl_AQA and CaFlow repos → not usable, AQA layer dropped (see CLAUDE.md Decisions)
- [x] Decide pose approach → in-browser MediaPipe Pose Landmarker
- [x] Run a webcam pose demo to confirm FPS → 60 FPS in Chrome (full model, GPU)
- [x] Lock element list → focus on 3 balances (see Phase 2); ring = stretch
- [x] Read the matching FIG Code of Points sections → `docs/rules.md`
- [ ] Collect 30-50 public competition clips for validating rules.

## Phase 1 - Skeleton + UI shell (Days 2-5)
- [x] Repo, README, .gitignore
- [x] Live webcam + pose overlay, video-file input
- [x] Keypoint smoothing (One Euro filter), confidence handling
- [x] Feature extraction: split angle, thigh elevation, relevé, leg foreshortening, rotation count

## Phase 2 - Elements + deductions (Days 6-9)
- [x] Detectors: split leap, passé balance, passé pivot, unit-tested on synthetic skeletons
- [x] **Focus balances** (user, 2026-10-08): front split with help (2.303), back split without help with
      whole foot above the head (2.1005), attitude (2.1202). `lib/elements/balances.ts`
- [x] Execution deductions per element, with values from the Code of Points
- [x] Difficulty values per element (focus balances: ⚠️ still to confirm, see Phase 4)
- [~] Unit tests on real keypoints: 9 competition photos as fixtures (`lib/library/examples/real-balances.json`); video clips not yet

## Phase 3 - Scoring + judge panel (Days 10-11)
- [x] Scoring engine: Final = D + A + E − penalties, top 8 DB, repetitions by box, judge reject
- [x] Judge panel UI (artistry, extra D/E, penalties)
- [x] Event log / audit trail with JSON export
- [x] White minimalist UI redesign
- [x] Live feedback: video overlay (pose, match, hold timer, live deduction, hints), card after each
      move, running total; focus mode (only the 3 balances)
- [x] Practice: leg angles on the video (split at the hips, each knee), green / amber / red by the
      deduction bands (`lib/draw.ts`)
- [x] Deduction report on Stop judging, with rulebook quotes and pages; print / PDF
- [x] Pose library + "Teach poses" (record 3 s / photos, export/import)
- [x] Simple redesign after the judges' review (2026-10-09): Practice / Judge tabs, one main button,
      plain-language results and tips, technical things moved to Settings

## Phase 4 - Validate + polish (Days 12-14)
- [x] Photo tools: `/tools/image-check`, `/tools/validate` (labeled folders → results + fixtures)
- [x] Photo check: 10/10 Commons photos match their labels (`docs/validation.md`)
- [ ] Confirm focus-balance D values against the CoP pictograms, p. 88-89 (0.30 / 0.50 / 0.20). **Owner: team**
- [ ] Shoot and label attitude + back split photos (`data/README.md`), run /tools/validate, send results.
      **Owner: team**; tune rules from mismatches. **Owner: Claude**
- [x] Deploy to Vercel: https://pinequest-s5-episode-1-team-6.vercel.app (live site checked 2026-10-13)
- [ ] Decide on a 2-3° measurement tolerance before the first −0.10 band. **Owner: user**
- [ ] Check detectors on 5-10 labeled side-on video clips per element; record agreement in
      `docs/validation.md`. **Owner: team + Claude**
- [x] README
- [x] Videos and photos of moves that lost points: watch, download, Saved videos page (2026-10-13)
- [ ] Try the move videos with a real camera on a laptop and a phone. **Owner: team**
- [ ] Demo script, pitch. **Owner: team**

## Hosting
- Vercel (Hobby). Deploys are manual: `npm run deploy` from an up-to-date `main` (needs `npx vercel login`
  once). Tests: `npm test`.
- Sign-in: Firebase Authentication (email and password, Google, or guest for demos) in the browser. Google on the
  live site needs the Vercel domain in Firebase → Authentication → Settings → Authorized domains. The public
  `NEXT_PUBLIC_FIREBASE_*` values are not committed (2026-10-13): copy `.env.example` to `.env`, and set the
  same four in Vercel → Project → Settings → Environment Variables.

## Migration to Next.js (2026-10-12)
Moved from the plain-JS `web/` app (Rhymnast repo) to this Next.js 16 + TypeScript repo, in steps:
- [x] Step 1: judging logic to `lib/` (TypeScript, same behaviour: the 108 tests pass and the rebuilt
      pose library is byte-identical), tests to vitest, docs, CLAUDE.md, PLAN.md
- [x] Step 2: UI as React components (Practice / Judge tabs, video + overlay, results, Settings, Teach poses),
      Tailwind. Checked with the team's front split video: same 2 judged moves as before
- [x] Step 3: developer tools as `/tools/*` pages, README, CI test workflow. Checked: the video tool gives
      the same 2 back-split moves as before; image check gives identical output to the old tool on 5 photos
- [x] One package manager: npm (`package-lock.json`). `bun.lock` was out of date and removed; CI already used npm
- [x] Example poses and real-photo fixtures moved from `tests/` to `lib/library/examples/` (they also build the shipped library)

## Later (not in the 2-week scope)
- Arabesque and side split balances; back split with help; pivots in the focus shapes
- Landing faults (heavy landing, arched back)
- Apparatus tracking

## Known limits (show in UI and README)
- Single camera = 2D angles. Split angles are only reliable when the camera is side-on to the split plane.
- Frames with low landmark visibility are not scored.
- The CoP says the angles are a guideline for judges; we report the measured angle, not a final verdict.

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
- [x] Confirm focus-balance D values against the CoP pictograms, p. 88-89 (done 2026-10-13, see Phase 5 and CLAUDE.md decision 12)
- [ ] Shoot and label attitude + back split photos (`data/README.md`), run /tools/validate, send results.
      **Owner: team**; tune rules from mismatches. **Owner: Claude**
- [x] Deploy to Vercel: https://pinequest-s5-episode-1-team-6.vercel.app (live site checked 2026-10-13)
- [x] Move hosting to Cloudflare Pages: https://rhymnast.pages.dev (2026-10-14)
- [x] Add `rhymnast.pages.dev` to Firebase → Authentication → Settings → Authorized domains; Google sign-in
      works on the live site (2026-10-15)
- [ ] Decide on a 2-3° measurement tolerance before the first −0.10 band. **Owner: user**
- [ ] Check detectors on 5-10 labeled side-on video clips per element; record agreement in
      `docs/validation.md`. **Owner: team + Claude**
- [x] README
- [x] Videos of every move, mistakes marked red, correct moves green: download, Saved videos page (2026-10-13)
- [x] "How it should look": reference clips next to a balance that lost points, in Practice (2026-10-14, decision 14)
- [ ] Reference clip for back split foot above the head (2.1005). **Owner: team**
- [x] Layout: one-row navbar with the Sports menu on the right, Practice / Judge switch on the cards, slim footer;
      portrait videos fit the screen (2026-10-14)
- [ ] Try the move videos with a real camera on a laptop and a phone. **Owner: team**
- [ ] Demo script, pitch. **Owner: team**

## Hosting
- Cloudflare Pages, project `rhymnast` (static export in `out/`). Deploys are manual: `npm run deploy` from an
  up-to-date `main` (needs `npx wrangler@4.151.0 login` once). Tests: `npm test`.
- Sign-in: Firebase Authentication (email and password, Google, or guest for demos) in the browser. Google on the
  live site works because `rhymnast.pages.dev` is in Firebase → Authentication → Settings → Authorized domains
  (added 2026-10-15). A new web address (e.g. a custom domain) must be added there too. The public
  `NEXT_PUBLIC_FIREBASE_*` values are not committed (2026-10-13): copy `.env.example` to `.env`; the deploy
  builds them into the site from there.

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

## Phase 5 - Three more elements (decided 2026-10-13)
- [x] Team records videos into `data/validation/videos/{arabesque,attitude_pivot,stag_leap}/` (1 + 2 + 2 clips)
- [x] Arabesque balance: detector + pose-library examples + tests
- [x] Stag leap: detector on top of the split-leap state machine + tests
- [x] Attitude pivot: attitude shape + turn measured from the facing angle + tests; checked on both videos
- [x] `npm run replay` + "Export body points" in /tools/video-analyze; the team's clips are regression tests (`tests/videos.test.ts`)
- [x] Decide: arabesque/attitude trunk lean → first 20° are natural, not deducted (user, 2026-10-13)
- [ ] More videos: `not_these/` look-alikes, faults (small/medium/large), several people; a stag leap filmed from the start
- [x] CoP codes and D values checked on the pictograms (p. 80, 88-89, 100), also the earlier balances

## Phase 6 - Cheerleading (user, 2026-10-14)
- [x] Sport switch in the header; separate gymnastics and cheer themes (light and dark)
- [x] Cheer motions: High V, Low V, T, touchdown, diagonal, L motion, punch, broken T (`lib/cheer/motions.ts`)
- [x] Cheer jumps: toe touch, pike, herkie, tuck, spread eagle (`lib/cheer/jumps.ts`)
- [x] Team-made rubric with references (#C1-#C6), report and move videos for cheer, synthetic-pose tests
- [ ] Film cheer motions and jumps (front and side) into `data/validation/videos/cheer/`; replay tests. **Owner: team**
- [ ] A cheer judge or coach checks the rubric values and jump D values. **Owner: team**
- [ ] Stretch: flyer body positions on the ground (liberty, heel stretch, scorpion) via the balance detector
- [x] Sport picker screen removed; **Sports** menu in the header; dark mode switch always top right (user, 2026-10-14)

## Phase 7 - Ballet (user, 2026-10-14)
- [x] Pose library per sport (`LibrarySpec`); ballet signature, default library, Teach poses for ballet
- [x] Poses: arabesque, attitude, développé devant, à la seconde, retiré, plié (`lib/ballet/poses.ts`)
- [x] Pirouette (turns counted) and grand jeté; team-made rubric #B1-#B8; theme; 30 tests
- [x] Replayed the team's real clips as ballet: arabesque right, four false calls fixed with stated rules
- [ ] Film ballet clips (side and front, faults too) into `data/validation/videos/ballet/`; replay tests. **Owner: team**
- [ ] A ballet teacher checks the rubric and difficulty values. **Owner: team**
- [ ] Check the pirouette turn counter on real retiré turns. **Owner: team + Claude**

## Phase 8 - Competition mode (user, 2026-10-15)
- [x] Firestore in the Firebase project (created by the Owner) + `firestore.rules`, checked live (42 checks)
- [x] Panel scoring: one role per judge (D / A / E), averages, 4+ judges drop highest and lowest (tests)
- [x] Organizer: competitions list, lobby with the QR code, roles, participants (count + names)
- [x] Judges: join from the QR code (sign in or guest), wait, score sheet with quick buttons and live AI
      suggestions (one tap), send once
- [x] Running: one participant at a time with the AI camera (or a video), confirm before starting,
      scoring progress, penalties, save result
- [x] Spectators' leaderboard (totals only, full screen) and the organizer's breakdown per participant
- [x] One judge is enough to start (no minimum of 3); roles without a judge are left out of the total
- [ ] Try a full competition with 3 real phones on the live site (`npm run deploy` first). **Owner: team**
- [ ] One-time QR code per judge. **Owner: Claude, when asked**
- [ ] A real RG judge checks the score sheets and the panel rule. **Owner: team**

## Later (not in the 2-week scope)
- Side split balance; back split with help; pivots in the focus shapes
- Landing faults (heavy landing, arched back)
- Apparatus tracking

## Known limits (show in UI and README)
- Single camera = 2D angles. Split angles are only reliable when the camera is side-on to the split plane.
- Frames with low landmark visibility are not scored.
- The CoP says the angles are a guideline for judges; we report the measured angle, not a final verdict.

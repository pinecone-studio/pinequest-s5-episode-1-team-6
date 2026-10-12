# Validation log

> Entries before 2026-10-12 use the old plain-JS layout (`web/js/...`, `web/tools/*.html`). Since the
> Next.js migration the same code lives in `lib/` and the tools are the `/tools/*` pages.

How well the detectors agree with what a person sees. Photos are from Wikimedia Commons and are
**not** committed (they live in the git-ignored `data/check/`). Checked with `web/tools/image-check.html`
and the full-size MediaPipe model.

## 2026-10-08: balances on 10 competition photos

| Photo (Commons) | What it shows | App says | Correct? |
|---|---|---|---|
| Natalia Gaudio 2016 Test Event 3 | Front split, hand holding the leg | Front split **with help**, split 185° → no deduction | ✅ |
| London 2012 group (7914939414) | Leg straight up, no hand | Front split without help, 183° | ✅ plausible |
| Universiade 2017 (36826333990) | Leg up behind, trunk horizontal (row 11) | Not scored | ✅ (out of scope) |
| Natalia Gaudio 2016 Test Event 2 | Front split, trunk bent back (row 5) | Not scored | ✅ (out of scope) |
| Fetisova 2020 Ribbon 2 | Front split, trunk bent far back, hand near leg | First run: "back split with help" ❌ → fixed: not scored | ✅ after fix |
| Malate 2023 (34) | Ring balance with help | First run: "attitude" ❌ → fixed: not scored | ✅ after fix |
| Carolina Pascual 02 | Split leap in the air | No balance | ✅ |
| Oceania 2022 (0694) | Beam (artistic) | No balance | ✅ |
| 2014 Europeans 3 | Leg up behind, trunk far forward (row 11) | Not scored | ✅ (out of scope) |
| KurylskayaBall | — | No person found by MediaPipe | — |

Not yet checked on real photos: **attitude** and **back split without help (foot above head)**: no
suitable Commons photo found. Both are covered by synthetic unit tests only. Next: record 5-10 side-on
clips of each balance and compare with a judge.

Re-run with /tools/validate and a `labels.csv`: 10 / 10 photos match their label. Their
landmarks are now unit tests in `lib/library/examples/real-balances.json` (numbers only, no images).

Live check: the front-split photo fed as a camera for 1.5 s gave "Front split balance with help,
DB 0.30, counted"; a second 0.6 s hold gave "repeat, E −0.30 not held 1 second".

Observation: a 1° deviation already costs −0.10 (the Code's bands start above 0°). Pose noise is about
±2-3°, so near-perfect shapes may get an occasional −0.10. Judges can reject the call.

## 2026-10-09: team videos (front split with help, back split without help)
Two side-on phone videos (1620×1080, 20 s and 28 s), dancer in black clothes in front of a dark TV.
Analysed frame by frame with `web/tools/video-analyze.html` (heavy model, 15 frames/s).

**What was wrong (before):** 0 judged moves on both videos.
1. The pose model placed the raised leg correctly but with 4-28% confidence (dark leggings on a dark
   background), and the app ignored any leg under 50%. → New plausible-leg check
   (`legsUsable` in `web/js/elements/balanceFrame.js`): support leg must be clear; the raised leg is
   accepted when its thigh and shin match the support leg's length.
2. Same for the hands holding the leg (10-27% confidence, but right at the ankle). → A low-confidence
   hand counts as help only when it is on the leg (≤ 0.07 torso lengths); an open hand beside the leg
   (London 2012 photo, 0.10) does not.
3. The team's back split is the **trunk-forward** back split (trunk 105-110° from vertical, legs in a
   180° line) = CoP table #11 row 11, which the app didn't know. → Added (2.1104).
4. Tool bug found and fixed: copying frames to a canvas in headless Chrome gave black frames; the
   tool now feeds the video element directly after a short decode wait.

**After:**

| Video | Holds | Judged | Execution | D |
|---|---|---|---|---|
| front_split_with_help | 2 | 2 × Front split balance with help | −0.00 (clean) | 0.20 (0.30 − 0.10 flat foot) |
| back_split_without_help | 2 | 2 × Back split balance, trunk forward | −0.00 (clean) | 0.30 (0.40 − 0.10 flat foot) |

The support heel stayed level with the toes in every hold (heel lift ≤ 0.07 shin lengths), so both were
judged **on flat foot** (#10.3: value −0.10). The full model gives the same moves; it measured the front
split 4-5° short (−0.10 after the 3° margin) where heavy measured it clean.

Over-deduction fixes from the same review (see `docs/rules.md` → Fair judging): one hold = one judgment
(no repeat/short-hold penalties from flicker), 0.4 s dropout tolerance, 3° camera margin.

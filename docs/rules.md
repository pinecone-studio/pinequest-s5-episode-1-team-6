# Rules we automate

Source: FIG **Rhythmic Gymnastics Code of Points 2025-2028**, mark-up version valid from 1 April 2025
(link in `data/README.md`). "p. N" = page N of that PDF. The code values live in `lib/rules.ts`.

Status: ✅ = checked against the CoP text · ⚠️ = needs a human to verify.

**How D values were read:** in the difficulty tables the value columns are 0.10 … 0.70, and each
element code ends in its column number (e.g. `1.101` sits in the 0.10 column, `1.303` in 0.30).
So the value = last two digits × 0.10. Cross-checked against the worked examples in the text.

## Final score
- Final score = D score + A score + E score; penalties are deducted from the final (General #5.2, p. 12) ✅
- D: body difficulties (DB), **highest 8 counted** (Difficulty #1.5, p. 21) ✅
- A (Artistry) is judged by humans in our app.
- E max 10, built from execution faults. "Execution faults must be penalized every time and for each
  element at fault" (Execution #1.6) ✅, so repeats still get E deductions.
- Repetition of a difficulty from the same box is not valid (#8.9 jumps; #12.3 rotations: different
  rotations = different boxes regardless of number of turns) ✅

## General shape rule (jumps, balances, rotations)
Difficulty #2.5.1-2.5.4, p. 25. Deviation per incorrect body segment:

| Deviation from the required shape | DB | Execution penalty | Status |
|---|---|---|---|
| 0° (exact shape or better) | valid | none | ✅ |
| small: ≤ 10° | valid | 0.10 per segment | ✅ |
| medium: 11-20° | valid | 0.30 per segment | ✅ |
| large: > 20° | **not valid** | 0.50 per segment | ✅ |

p. 26: "The angles are just a guideline. Judges will learn to think in terms of small, medium, and
large deductions." So the app shows **measured angle + suggested band**; a judge can reject it.

## Split leap: code 1.2103, value 0.30 ✅
- "A split position of 180° is required at the highest point of the leap. The split position may be
  horizontal and will also be accepted when the 180° position is maintained with 1 of the legs above
  and the other below a horizontal position." (table #9, p. 74) ✅
- Value: table #9 item 21, code 1.2103 → 0.30 (p. 78). Matches the example "DB valid: 0.30 p." on p. 72 ✅
- Basics: defined and fixed shape during flight; height sufficient to show it (#8.1.1, p. 72) ✅

**Measured as:** angle between the legs (mid-hip → each ankle), measured through the bottom so
over-splits read above 180°. Best value among frames near the top of the flight (hips ≥ 70% of max
rise). Deviation = 180 − angle → band above. Warns when a leg is foreshortened (camera not side-on).

## Passé balance: code 2.101, value 0.10 ✅
- Passé forward or side, thigh at horizontal (table #11 item 1, p. 88) ✅
- "Stop position fixed in the shape for a minimum of 1 second" (#10.1.2) ✅
- Held less than 1 s with a well-defined shape: valid, E penalty 0.30 "shape not held for a minimum
  1 second" (#10.2.2, p. 84) ✅. No stop at all (swing/kick): not valid (#10.2.3).
- On flat foot the value is reduced by 0.10 (#10.3, p. 84) ✅, so a flat-foot passé = 0.00.

**Measured as:** free thigh elevation from the knee's vertical position (works from any camera
direction); free foot at support-knee height; support leg straight; relevé = heel clearly above toes.
Shapes held under 0.3 s are treated as passing movements, not balance attempts.

## Passé pivot: code 3.101, value 0.10 for 360° ✅
- Minimum basic rotation 360° (#12.1.2, p. 91) ✅
- +0.10 per additional rotation for pivots with base value 0.10 (#12.2.5, p. 92) ✅
- Pivot "must be executed with a high relevé position"; low relevé = E penalty (#12.1.1) ⚠️ not automated
- Heel support stops further rotations from counting (#12.2.3) ⚠️ not automated

**Measured as:** rotations counted from the body's apparent width (wide when facing toward/away
from the camera, narrow when side-on; each change ≈ 90°). Accuracy about ±45°.

## How the three balances are recognized (pose library)
Recognizing WHICH pose it is and measuring HOW FAR it is from the rulebook are separate steps.
- **Which pose:** every frame becomes a pose signature (10 numbers: split angle, free knee, thigh
  height, leg height, signed trunk lean, leg in front or behind, hand on the leg, foot height vs hip
  and head, leg raised). It is compared with the pose library (`lib/library/`): the nearest 7
  examples vote. Too far from every example, or "Not one of these" wins → no pose.
- **The library** = ~1,000 shipped examples (`lib/library/defaultLibrary.json`, built by
  `npm run build-library` from synthetic poses over the range judges see + real photos) plus the
  examples your team teaches in the app ("Teach poses": record 3 s or add photos). Taught examples stay
  in the browser; export/import shares them.
- **How far:** always the rulebook geometry below (degrees per body segment → #2.5 bands), so every
  deduction is explained by the Code of Points, never by the library.
- Front vs back split with the leg near vertical: decided by the trunk (front splits stay upright or
  lean back; back splits lean forward), checked on competition photos.

## Fair judging: how the app avoids over-deducting
The Code says the angles are "just a guideline. Judges will learn to think in terms of small, medium,
and large deductions" (p. 26). The app follows the bands, but does not punish camera noise:
- **3° camera margin:** one 2D camera measures joint angles to about ±3°, so the first 3° of a measured
  deviation are not deducted (`MEASUREMENT_MARGIN_DEG` in `lib/rules.ts`). Example: split measured
  8° short → judged 5° → small (−0.10); measured 2° short → no deduction.
- **One balance = one judgment:** a hold is not split into several moves by tracking noise. Front split
  with/without help (same table box) is one hold, decided by majority; another shape must last 0.25 s
  before the hold switches; tracking dropouts up to 0.4 s don't end the hold. Before this fix one
  balance could get "not held 1 second" (−0.30) plus a repeat.
- **Median over the hold:** each segment's deviation is the median of all frames of the hold, so the
  entry and exit frames don't count against the gymnast.

## Balances: shared rules ✅
- On the foot: "Defined and clearly fixed shape" and "Stop position fixed in the shape for a minimum
  of 1 second" (#10.1.2, p. 82) ✅
- Held < 1 s with a well-defined shape: valid, E −0.30 (#10.2.2, p. 84) ✅. No stop (swing/kick): not
  valid (#10.2.3) ✅ (we ignore holds under 0.3 s).
- Flat foot: value −0.10 (#10.3, p. 84) ✅. Support leg straight or bent: same value (#10.4) ✅.
- Deviations are per body segment and add up, e.g. "Small deviation of the split + Medium deviation of
  the trunk: 0.10 + 0.30 p., DB valid" and "Large deviation of the trunk 0.50 p., DB not valid"
  (examples, p. 83) ✅
- Holding the support leg with the hand: not valid (#10.5) ⚠️ not automated. Apparatus technical element
  required (#10.8) ⚠️ not automated (judges check).

## Front split balance with help: row 3, code 2.303, value 0.30 ⚠️ value
- Technique: "Front split with or without help · Split is required" (#10.11, p. 86) ✅
- Table #11 row 3 "Front split with or without help" lists 2.303 (0.30) and 2.305 (0.50) (p. 88).
  ⚠️ We assume **with help = 0.30, without help = 0.50** (order of the row title). Check the pictograms.
- **Measured as:** free leg forward of the head, straight; split = angle between the legs at the hips;
  deviation = 180° − split. "Help" = a wrist or finger within 0.3 torso lengths of the free shin/foot.
  Without help it's scored as 2.305; both are the same box, so only one counts.

## Back split balance without help (foot above head): row 10, code 2.1005, value 0.50 ⚠️ value
- Technique: "Free leg high up backward, without help · Split is NOT required; whole foot above the
  head is required · Touching is NOT required" (#10.11, p. 87) ✅
- Table #11 row 10 "Back split with help, also foot above head without help" lists 2.1003 (0.30) and
  2.1005 (0.50) (p. 89). ⚠️ We assume **foot above head without help = 0.50**. Check the pictograms.
- **Measured as:** free leg backward (foot behind the head), knee straight, leg at least 30° above
  horizontal, trunk lean < 60°. Deviation = degrees the leg must still rise at the hip until the lowest
  point of the foot (heel or toes) is above the top of the head. MediaPipe has no head-top point: we use
  the highest eye/ear/nose point + 0.2 torso lengths.
- Back split **with** help and trunk-forward back splits (row 11) are not scored: in 2D they look like a
  front split with the trunk bent back (seen on a competition photo).

## Back split balance, trunk forward: row 11, code 2.1104, value 0.40 ⚠️ value
- Table #11 row 11 "Back split with or without help, trunk forward at the horizontal or below, or with
  ring without help" lists 2.1104 (0.40) and 2.1106 (0.60, ring) (p. 89). ⚠️ We assume the plain back
  split with the trunk forward = 0.40.
- The balance pages give no separate technique text for this row; the matching rotation (p. 97)
  defines the shape: "Split position required. The trunk should remain at the horizontal or below."
- Added 2026-10-09: the team's "back split without help" video shows this shape (trunk 105-110°
  from vertical, i.e. just below horizontal, legs in a 180° line).
- **Measured as:** free leg backward and straight, leg up, trunk lean ≥ 65° forward. Two segments:
  **split** deviation = 180° − split; **trunk** deviation = degrees the trunk is above horizontal.

## Attitude balance: row 12, code 2.1202, value 0.20 ⚠️ value
- Technique: "Attitude · Horizontal position of the free leg (thigh) and the maximum vertical position
  of the body" (#10.11, p. 87) ✅
- Table #11 row 12 "Attitude, also ring with help/with the leg on the shoulder, also ring without
  help/attitude with back bend of the trunk" lists 2.1202, 2.1203, 2.1204 (p. 89). ⚠️ We assume the plain
  attitude = 0.20 (first in the row title).
- **Measured as:** free leg backward, knee bent 60-140°, no hand on the leg, foot not at the head (that's
  a ring). Two segments: **thigh** deviation = 90° − thigh elevation; **trunk** deviation = lean from
  vertical. Each gets its own band and penalty (p. 83 examples).

## Not automated yet (judges enter by hand)
- Heavy landing; visibly arched back on landing; swing technique ("kip") (Execution table, p. 121) ⚠️
  penalty column to verify before automating
- Other balances (arabesque, side split, etc.): value columns on p. 88-89 are pictogram-dependent ⚠️
- Apparatus difficulties (DA), R elements, dance steps, apparatus faults, artistry

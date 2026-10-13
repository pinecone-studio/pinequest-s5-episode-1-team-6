# Cheerleading: what we automate

Added 2026-10-14 (branch `27-new-sport-added---cheerleading`). Pick it in the header: **Sports → Cheerleading**.

## Where the numbers come from (be honest about this)

Cheerleading has **no public per-degree deduction table** like the FIG Code of Points. USASF and ICU
score sheets score jumps and motions on ranges ("technique", "execution") and leave the numbers to the
judges. So the cheer values are **our own rubric** (`lib/cheer/rules.ts`, sections #C1-#C6; the 0.10 / 0.20 / 0.30 bands are shared with ballet: `TECHNIQUE_BANDS` in `lib/rules.ts`), written
from the technique those sheets and coaches describe. All are `verified: false` until a cheer judge or
coach checks them. The UI and report say "team-made technique rubric, not an official score sheet".

## Score

Same engine as gymnastics: **Final = D + Showmanship + E − penalties** (Showmanship replaces Artistry
and is entered by the judges, like facial expression and crowd appeal).

- **D**: jumps only (relative values, ours): toe touch 0.30, pike 0.30, herkie 0.20, tuck 0.10,
  spread eagle 0.10. A jump repeated counts once; highest 8 count.
- **E**: 10 − the rubric deductions below − the judges' extra deductions.
- Motions have no difficulty value: they are "judged on technique only".

## Rubric (`lib/cheer/rules.ts`)

The first 3° of every measured deviation are not deducted (camera margin, same as gymnastics).

| Section | Rule | Deduction |
|---|---|---|
| #C1 | Motion placement: each arm on its target angle | ≤10° −0.10, 11–20° −0.20, >20° −0.30 per arm |
| #C2 | Straight, locked arms in a motion (not in a broken T) | −0.10 per arm with the elbow under 160° |
| #C3 | Toe touch, pike, herkie: legs at least level with the hips | ≤10° −0.10, 11–20° −0.20, >20° −0.30 and no difficulty |
| #C4 | Straight knees in straight-leg jumps | −0.10 per leg with the knee under 155° |
| #C5 | Tuck: knees up to hip height or higher | same bands as #C3 |
| #C6 | Jump arms: T in a toe touch, High V in a spread eagle | −0.10 when more than 20° off |

## Elements

Arm angles are measured from straight down: 0° down, 90° a T, 180° straight up.

| Element | How it is recognized | Camera |
|---|---|---|
| High V | both arms straight, up and out at 135° | front |
| Low V | both arms straight, down and out at 45° | front |
| T motion | both arms straight out at 90° | front |
| Touchdown | both arms straight up at 180° | front |
| Diagonal | one arm at 135°, the other at 45° (either side) | front |
| L motion | one arm at 180°, the other at 90° (either side) | front |
| Punch | one arm at 180°, the other hand on the hip | front |
| Broken T | upper arms at 90°, elbows bent | front |
| Toe touch | in the air: straddle, both legs straight, at least 55° up | front |
| Spread eagle | in the air: straddle, both legs straight, 20–55° up | front |
| Herkie | in the air: one straight leg out to its side, the other bent and low | front |
| Pike | in the air: both legs straight and together, at least 55° up | side |
| Tuck jump | in the air: both knees bent under 110°, thighs at least 45° up | side |

A motion counts when it is held at least 0.3 s (passing through a T on the way to a High V is not a
motion); it is judged on the median arm angles of the hold. While in the air the arms belong to the
jump, so no motion is judged. Frames where the athlete is side-on are skipped for motions.

Jumps reuse the leap detector's take-off / landing logic (`lib/elements/splitLeap.ts`). The shape seen
most often near the top of the jump decides which jump it was; the best frame of that shape is judged.

## Not automated (judges enter by hand)

Stunts, pyramids, tosses and tumbling (need several people and spotting), synchronization between
athletes (the app follows one person), pointed toes, landings, voice, showmanship and facial expression.

## Next steps

- Film the team's motions and jumps (front and side) into `data/validation/videos/cheer/<element>/`
  and add them as replay tests (`tests/videos.test.ts`), as for gymnastics.
- A cheer judge or coach checks the rubric values and the jump D values.
- Stretch: flyer body positions practised on the ground (liberty, heel stretch, arabesque, scorpion),
  which could reuse the gymnastics balance detector.

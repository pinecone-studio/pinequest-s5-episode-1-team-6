# Ballet: what we automate

Added 2026-10-14 (branch `27-new-sport-added---cheerleading`). Pick it in the header: **Sports → Ballet**.
Built the same way as rhythmic gymnastics: a pose library recognizes WHICH pose it is (by example,
no neural-net training), and geometry measures HOW FAR it is from the pose, with a reference for
every deduction.

## Where the numbers come from (be honest about this)

Ballet has **no per-degree deduction table**. Competitions (YAGP, Prix de Lausanne) and exams (RAD,
Cecchetti, Vaganova) are judged by eye. So the values are **our own rubric** (`lib/ballet/rules.ts`,
sections #B1-#B8), written from common classical corrections. All are `verified: false` until a ballet
teacher checks them; the UI and report say "team-made technique rubric, not an official syllabus".

## Score

Same engine as the other sports: **Final = D + Artistry + E − penalties**. Held poses are judged on
technique only (no difficulty value). Difficulty (ours): pirouette 0.10 + 0.10 per extra turn,
grand jeté 0.20.

## Rubric (`lib/ballet/rules.ts`)

The first 3° of every measured angle are not deducted (camera margin, as in gymnastics).

| Section | Rule | Deduction |
|---|---|---|
| #B1 | Extensions: working leg (thigh in attitude) at least 90° | ≤10° −0.10, 11–20° −0.20, >20° −0.30 |
| #B2 | Straight standing leg; straight working leg in arabesque, développé, à la seconde | −0.10 per leg under 160° |
| #B3 | Trunk upright; arabesque may tilt 25°, attitude 15°, the rest 5° | beyond that: same bands as #B1 |
| #B4 | Balances held at least 1 s (not plié) | −0.20 |
| #B5 | Retiré: toe at the knee | >15% of a shin below −0.10, >30% −0.20, >45% −0.30 |
| #B6 | Plié: knees bent evenly | more than 10° apart −0.10 |
| #B7 | Grand jeté: 180° split at the top | same bands as #B1; >20° short = no difficulty |
| #B8 | Pirouette: at least one full turn, on demi-pointe | under 360° −0.30 and no difficulty; flat foot −0.10 |

## Elements

| Element | How it is recognized | Camera |
|---|---|---|
| Arabesque | pose library: straight leg behind, raised | side |
| Attitude | pose library: thigh behind, raised, knee bent | side |
| Développé devant | pose library: straight leg in front, raised | side |
| À la seconde | pose library: straight leg out to the side, raised | front |
| Retiré | pose library: toe at the standing knee | side or front |
| Plié (demi / grand) | pose library: both knees bent, both feet down; grand under 100° | front |
| Pirouette | retiré shape (vertical distances only) while the facing angle turns ≥ 180° | any |
| Grand jeté | the leap detector's split leap, re-judged with #B7 | side |

## How recognition works ("training")

- **Signature** (`lib/ballet/frame.ts`): 10 numbers per frame: camera view (side / front), both knees,
  thigh and foot height, leg in front or behind, trunk lean, foot against the standing knee, foot off
  the floor, foot out to the side.
- **Default library** (`lib/ballet/defaultLibrary.json`): 960 synthetic examples (160 per pose, clean and
  faulty, both facing directions, relevé and flat, noise) + 280 look-alikes to reject (standing, tendus,
  coupé, penché). Rebuild with `npm run build-library` after changing `frame.ts` or `examples/poses.ts`.
- **Teach poses** (Settings, when Ballet is picked): record 3 s or add photos of correct poses; kept in
  this browser under their own key, shareable as a file. Gymnastics and ballet libraries are separate.
- Until the library knows every pose, fixed rules decide (`rulePose` in `lib/ballet/poses.ts`).

## Checks done (2026-10-14)

- 30 synthetic-skeleton tests (`tests/ballet.test.ts`).
- Recognition on 2,100 fresh random poses (other seed, more noise): 99–100% per pose, 100% look-alikes
  rejected. Synthetic only: it says the library and rules are consistent, not that real video works.
- The team's **real gymnastics clips replayed as ballet** (`tests/videos.test.ts`):
  - `arabesque_1`: two arabesques, leg 93–95°, trunk 24–27° (inside the arabesque allowance): no deduction.
  - The other clips gave four false calls at first. Each fix is a rule with a reason, and each was checked
    to be what removed its call:
    - front split held by the hand → "Développé devant": **a leg held with the hand is a stretch**, not judged
      (side view only: from the front an arm in second position looks like it holds an à la seconde leg);
    - retiré passed while turning in attitude → **a pose that turns more than 90° is a turn**, not a balance;
    - arabesque passes on the way into a penché (0.4–0.67 s) → **a pose under 0.7 s is a movement**, not judged.
      The 0.67 s pass is close to that limit: fragile;
    - the plié before a pirouette (0.53 s) → removed by the same 0.7 s rule. It was a fourth-position plié seen
      from the front: the even-knees check assumes first or second position, and every plié call says so.

## Not automated (the teacher enters it)

Turnout, pointed feet, port de bras, épaulement, the five positions of the feet, spotting, landings,
musicality and artistry; pirouettes in attitude or arabesque; partnering.

## Next steps

- Film ballet clips (side and front, clean and with faults) into `data/validation/videos/ballet/<element>/`,
  export body points, add them to `tests/videos.test.ts`.
- A ballet teacher checks the rubric values and the difficulty values.
- Real pirouettes: the turn counter was checked on gymnastics attitude turns, not on retiré turns yet.

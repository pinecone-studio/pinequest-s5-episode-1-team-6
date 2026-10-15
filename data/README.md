# Data

Nothing in this folder is committed (see `.gitignore`). This file explains where to get the data.

## Pose model
The MediaPipe Pose Landmarker model (`.task`) is loaded by the web app from Google's CDN at runtime.
You do not need to download it.

## Validation clips
We validate rules on **public competition videos** (FIG / national federation broadcasts on YouTube).
- Save clips locally in `data/clips/`, named `<element>_<source>_<n>.mp4`, e.g. `splitleap_fig2025_01.mp4`.
- Prefer clips filmed side-on to the gymnast (needed for reliable split angles).
- Track the source URL and timestamp of every clip in `data/clips/SOURCES.md` (also not committed).
- Do not redistribute the videos. Only keypoint JSON extracted from them goes into the repo as test fixtures.

## RG dataset (optional, reference only)
1000 rhythmic gymnastics routines (ball, clubs, hoop, ribbon) with D/E/total scores, from the
ACTION-NET repo: https://github.com/qinghuannn/ACTION-NET
- The repo has **no license**. Use it for internal reference only; do not redistribute.
- The OneDrive download link returned HTTP 403 to scripts on 2026-10-08. Try it in a browser.

## FIG Code of Points
RG Code of Points 2025-2028 (mark-up, valid from 1 April 2025), from the FIG rules page:
https://www.gymnastics.sport/publicdir/rules/files/en_1.1%20-%20RG%20Code%20of%20Points%202025-2028%20(mark-up)%20-%20valid%20from%201st%20April%202025.pdf
Rules we implement are summarized with page numbers in `docs/rules.md`.

## Validation photos (real people)
Used to **check and tune** the rules, not to train anything. Never commit them: they are photos of
real people, often minors. Keep them here locally and share them inside the team through a private
shared drive.

```
data/validation/
  front_split_help/   labels.csv + photos
  front_split/        (without help)
  back_split/         (without help, trunk upright, foot above head)
  attitude/
  not_these/          look-alikes and other shapes that must NOT be scored
```

`labels.csv` (optional, one per folder; the folder name is used when a photo has no row):

```
file,expected_shape,judge_deduction,notes
ana_01.jpg,attitude,0.10,thigh slightly low
ana_02.jpg,attitude,0,clean
```

- `expected_shape`: `front_split_help`, `front_split`, `back_split`, `attitude` or `none`
- `judge_deduction`: what a judge deducts **for the shape only** (deviation bands: 0, 0.10, 0.30, 0.50,
  or a sum such as 0.40 for thigh + trunk on an attitude). Leave empty if unknown.

How to take them:
- Camera **side-on** and level, at hip height; whole body in frame; both feet visible.
- Capture the held position, not the way in or out.
- For each element: some clean shapes **and** some with small, medium and large faults. The faults
  are what test the deductions. At least 10 photos per element, from several people.

Run them through <http://localhost:3000/tools/validate> (nothing is uploaded). It can export the
body-point numbers (no images) as `lib/library/examples/real-balances.json`, which turns every photo into
a permanent unit test.

## Reference videos (2026-10-14)
The originals of the "How it should look" clips go in `data/reference/` (not committed): front split with
help, back split (body forward), attitude. The app uses trimmed, cropped and shrunk copies (0.4-0.6 MB
each) in `public/reference/`, the only videos in git; they were made in the browser (MediaRecorder), and
`lib/reference.ts` maps each element code to its clip. To replace one, judge the new clip in the app
first (same element, no points lost), trim it to the move, then open
<http://localhost:3000/tools/reference-video> and save its result in `public/reference/` with the same
file name. The tool draws the skeleton like on the gymnast's own move video, puts the clip in a 16:9
frame (a portrait clip gets blurred sides) and can cut text off the top or bottom.
Since 2026-10-16 all three clips are made this way (from the previous copies, as the originals were not
at hand); the front split with help had "Difficulty: 0.3" burned in at the top: 19% cut off the top.

## Validation videos (new elements, 2026-10-13)
Same rules as the photos: real people, never commit, share through the team's private drive.

```
data/validation/videos/
  arabesque/        arabesque balance (free leg back, knee straight)
  attitude_pivot/   attitude held while turning
  stag_leap/        jump with front leg folded, back leg stretched
  not_these/        look-alikes that must NOT be scored (attitude balance, split leap, ...)
  front_split_help/          earlier team video (2026-10-09)
  back_split_trunk_forward/  earlier team video (2026-10-09): back split without help, trunk forward
```

- Name files `<person>_<n>.mp4`, e.g. `ana_01.mp4`. One element per clip, a few seconds each.
- Camera side-on, level, at hip height, whole body and both feet in frame, plain light background
  if possible (dark leggings on a dark wall lower pose confidence).
- Record clean ones **and** ones with small, medium and large faults, from several people.
- Optional `labels.csv` per folder: `file,expected_shape,judge_deduction,notes`.
- Start each clip **standing in the picture**, with **nobody else in view**: when the gymnast runs in
  from outside, the pose model first follows the other person and needs ~0.5 s to trust her legs
  (stag_leap clip 2, 2026-10-13: the leap was missed).
- To keep a clip as a test: open it in <http://localhost:3000/tools/video-analyze>, press **Export body
  points** (numbers only, no images), put the file in `tests/fixtures/videos/` and add a test to
  `tests/videos.test.ts`. `npm run replay -- file.landmarks.json` prints what the app judges.

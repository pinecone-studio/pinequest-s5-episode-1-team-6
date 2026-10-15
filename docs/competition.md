# Competition mode

A rhythmic gymnastics competition with **human judges on their phones** and the **AI camera as an
assistant**. The organizer runs it from a laptop; at least 3 judges join by scanning a QR code; the
judges' scores, not the AI's, make the result.

## Who does what

| Who | Where | What they see and do |
|---|---|---|
| Organizer | `/compete` (laptop with the camera) | Creates the competition, shows the QR code, gives each judge a role, adds the participants, starts each participant, ends the performance, enters penalties, saves each result, finishes the competition. Sees every judge's score and sheet. |
| Judge | `/judge?c=…&k=…` (phone, tablet or computer; from the QR code) | Signs in (or **Try without an account**), types their name, waits for their turn, then scores on a sheet made for their role. The AI's suggestions arrive live; one tap adds one. No video. |
| Spectators | `/compete/board?c=…` (second screen or projector, opened by the organizer) | Places, names and total scores, live. Nothing about who gave what or where points were lost. |

## The flow

1. **Lobby.** The organizer creates a competition and shows the QR code (one per competition, see
   [Decisions](#decisions)). Each judge scans it with the phone camera, signs in and joins. The organizer's page gives every new judge a role at once (D, A, E, D, …: the role with the fewest judges) and the organizer can change it. The number of participants can be set before or after the judges join; they are "Participant 1, 2, …" until renamed. **Start competition** works once there are at least 3 judges, every role has one, and there is a participant.
2. **Running.** The organizer turns the camera on (or picks a video for a demo) and presses **Start** for the next participant (or any participant on the list). The app asks first: "Start judging 2. Anu?". Then the AI judges the routine and the judges' phones show the participant, a timer and the AI's suggestions.
3. **Finish performance.** The judges can now send their scores (once; it can't be changed after).
   The organizer sees who has sent ("2 of 3 sent"), the result so far, and enters penalties.
   **Save result** stores it and the leaderboard updates. If a judge drops out, **Save result now**
   uses the scores that came in (every role needs at least one).
4. **Finish competition.** The leaderboard shows the final ranking.

## The judges' score sheet

Each judge has **one role**, like the panels at an FIG competition:

| Role | The judge's score | Quick buttons | AI suggestions |
|---|---|---|---|
| **D** Difficulty | the sum of the difficulties they count | +0.10 … +0.50 (for elements the AI can't see, e.g. apparatus) | every recognized balance / leap / pivot that counts, with its value |
| **A** Artistry | 10 − their artistic deductions | −0.10, −0.20, −0.30, −0.50 | none: the AI does not judge artistry (the sheet says so) |
| **E** Execution | 10 − their technical deductions | −0.10, −0.30, −0.50 (small / medium / large, #2.5) | every deduction the AI measured, with the reason ("The raised thigh was 14° below hip height.") |

A suggestion counts only when the judge taps it (tap again to take it off). The sheet shows every
line with ✕ and Undo, stays in the tab if the page reloads, and keeps the phone's screen on.
Code: `lib/competition/judgeSheet.ts`, `components/competition/ScoreSheet.tsx`.

## How the result is made

`lib/competition/panel.ts`:

- **Final = D + A + E − penalties** (General #5.2, p. 12; the same formula as `lib/scoring.ts`).
- **Several judges in one role:** with **4 or more**, the highest and the lowest score are left out
  and the rest averaged (as FIG does for its 4-judge A and E panels); with fewer, a plain average.
  This is a **team rule** for small panels: the repo has no Code of Points text on panel sizes.
  The organizer's breakdown marks the scores that were left out.
- A and E stay within 0–10; the final is never below 0. Results are shown with 3 decimals (26.850).
- Penalties are entered by the organizer (the coordinator judge's job).
- Equal totals share a place on the leaderboard (1, 1, 3). FIG's tie-break rules are not applied.

## Data and security (Firestore)

The site has no server; the browsers talk to **Firestore** (in the same Firebase project as sign-in)
and get changes live. Layout and code: `lib/firebase/competition.ts`, shapes in `lib/competition/types.ts`.

```
competitions/{cid}                        name, owner, status, phase, who is on the floor
  private/join                            the join key in the QR code (organizer only)
  judges/{uid}                            name, role
  participants/{pid}                      order, name, status, penalties, result
    scores/{judgeUid}                     one judge's score and sheet
  live/current                            the AI's suggestions while someone performs
```

[`firestore.rules`](../firestore.rules) enforces who may do what (checked against the live database
with an organizer, 3 judges and a stranger: 42 checks):

- Only the organizer edits the competition, participants and results; strangers can't read anything.
- A judge can join only with the key from the QR code, and can't pick their own role.
- A judge sends **one** score, only while that participant is being scored, only in their own role,
  and sees only their own score.
- The AI's suggestions are written by the organizer and read by the judges, at most twice a second
  (`lib/competition/livePublisher.ts`); a 90 s routine is about 180 writes. The free Firebase plan
  allows 20,000 writes and 50,000 reads a day.

### Setting up Firestore (once per Firebase project)

Done for `rhymnast-35f9e` on 2026-10-15. For another project:

1. Firebase console → **Databases & Storage → Firestore → Create database** (needs the project
   **Owner**; the Editor role can't create databases). Location e.g. `asia-east2`, **production mode**.
2. **Firestore → Rules**: replace everything with the contents of `firestore.rules` → **Publish**.
   Do this again whenever `firestore.rules` changes.
3. Authentication must allow **Anonymous** (for "Try without an account") as for the rest of the app.

## Demo without a gymnast

Pick **or use a video** on the organizer's page (e.g. `public/reference/attitude.mp4`); each participant
plays it from the start. Judges can join from other browser windows (guest) or phones on the live site.

## Known limits

- Rhythmic gymnastics only (the organizer's camera always judges gymnastics).
- One QR code per competition: anyone with the code can join as a judge. The organizer sees every
  judge and can remove one. A one-time code per judge is planned.
- The organizer's page must be open for new judges to get a role and for the AI suggestions to flow.
- The AI judges only what it can measure (body difficulties and their execution faults). Apparatus,
  dance steps and artistry stay with the judges.

## Decisions

From the user, 2026-10-15: one role per judge (D / A / E); one QR code per competition (one per judge
later); the AI only suggests, the result is the judges'; Firestore in the existing Firebase project.

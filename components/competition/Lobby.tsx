'use client';

// The organizer's competition before it starts:
//   left:  the QR code judges scan, and the judges who joined (live), each with a role;
//   right: the participants (how many, names);
//   top:   Start competition, once there are 3 judges, every role and a participant.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getJoinKey, setJudgeRole, startCompetition, watchJudges, watchParticipants } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import { canStart, MIN_JUDGES, roleForNewJudge, type Role } from '@/lib/competition/panel';
import { judgeLink } from '@/lib/competition/links';
import type { Competition, Judge, Participant } from '@/lib/competition/types';
import { bigButton, primaryButton, smallText } from '../ui';
import { card, CardTitle, CompetitionShell, StatusLine } from './CompetitionShell';
import { JoinQr } from './JoinQr';
import { JudgesList } from './JudgesList';
import { ParticipantsEditor } from './ParticipantsEditor';
import { useWatch } from './useWatch';

export function Lobby({ competition }: { competition: Competition }) {
  const cid = competition.id;
  const judges = useWatch(useCallback(
    (onChange: (j: Judge[]) => void, onError: (e: Error) => void) => watchJudges(cid, onChange, onError),
    [cid],
  ));
  const participants = useWatch(useCallback(
    (onChange: (p: Participant[]) => void, onError: (e: Error) => void) => watchParticipants(cid, onChange, onError),
    [cid],
  ));
  const link = useJoinLink(cid);
  useGiveRoles(cid, judges.value);
  const [starting, setStarting] = useState(false);

  const roles = (judges.value ?? []).map((j) => j.role).filter((r): r is Role => r !== null);
  const check = canStart(roles, participants.value?.length ?? 0);
  const error = judges.error ?? participants.error;

  async function start() {
    setStarting(true);
    try {
      await startCompetition(cid);
    } finally {
      setStarting(false);
    }
  }

  return (
    <CompetitionShell
      crumb="Competition"
      title={competition.name}
      intro="Getting ready: judges join with the QR code, you add the participants, then start."
      wide
      actions={
        <div className="grid justify-items-end gap-1 max-sm:w-full max-sm:justify-items-stretch">
          <button className={`${primaryButton} ${bigButton}`} disabled={!check.ok || starting} onClick={() => void start()}>
            Start competition
          </button>
          <p className={`${smallText} text-right max-sm:text-left`} aria-live="polite">{check.reason ?? 'Everyone is ready.'}</p>
        </div>
      }
    >
      {error && <StatusLine error>{competitionErrorText(error)}</StatusLine>}
      <div className="grid gap-6 min-[960px]:grid-cols-2">
        <section className={card} aria-labelledby="judges-title">
          <CardTitle aside={<JudgeCount count={judges.value?.length ?? 0} />}>
            <span id="judges-title">Judges</span>
          </CardTitle>
          {link ? <JoinQr link={link} /> : <p className={smallText} role="status">Making the QR code…</p>}
          {judges.value && <JudgesList cid={cid} judges={judges.value} />}
          <p className={smallText}>
            Each judge has one role, like at an FIG competition: Difficulty (D), Artistry (A) or Execution (E).
            With several judges in a role, their scores are averaged.
          </p>
        </section>
        <section className={card} aria-labelledby="participants-title">
          <CardTitle><span id="participants-title">Participants</span></CardTitle>
          {participants.value ? <ParticipantsEditor cid={cid} participants={participants.value} /> : <p className={smallText} role="status">Loading…</p>}
        </section>
      </div>
    </CompetitionShell>
  );
}

function JudgeCount({ count }: { count: number }) {
  const enough = count >= MIN_JUDGES;
  return (
    <span className={`text-sm font-semibold tabular-nums ${enough ? 'text-good' : 'text-muted'}`}>
      {enough ? `${count} joined ✓` : `${count} of ${MIN_JUDGES} needed`}
    </span>
  );
}

/** The judges' join link (the key is read once; only the organizer may read it). */
function useJoinLink(cid: string): string | null {
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getJoinKey(cid).then((key) => {
      if (alive) setLink(judgeLink(window.location.origin, cid, key));
    });
    return () => { alive = false; };
  }, [cid]);
  return link;
}

/** A judge who just joined has no role yet: give them the role with the fewest judges (D, A, E, D, …). */
function useGiveRoles(cid: string, judges: Judge[] | undefined): void {
  const pending = useRef(new Set<string>());
  useEffect(() => {
    if (!judges) return;
    const roles = judges.map((j) => j.role).filter((r): r is Role => r !== null);
    for (const j of judges) {
      if (j.role !== null || pending.current.has(j.uid)) continue;
      const role = roleForNewJudge(roles);
      roles.push(role);
      pending.current.add(j.uid);
      void setJudgeRole(cid, j.uid, role).finally(() => pending.current.delete(j.uid));
    }
  }, [cid, judges]);
}

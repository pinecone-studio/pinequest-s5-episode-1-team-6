'use client';

// The QR code judges scan with their phone camera, and the same link to copy.
// Always black on white, also in dark mode: phone cameras read inverted QR codes badly.

import { useMemo, useState } from 'react';
import { qrShape } from '@/lib/competition/qr';
import { ghostButton, smallText } from '../ui';

const QUIET_ZONE = 4; // white modules around the code, as the QR standard asks

export function JoinQr({ link }: { link: string }) {
  const qr = useMemo(() => qrShape(link), [link]);
  const [copied, setCopied] = useState(false);
  const box = qr.size + QUIET_ZONE * 2;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', link); // clipboard blocked: let them copy it by hand
    }
  }

  return (
    <div className="grid justify-items-center gap-3 text-center">
      <svg
        viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
        className="h-auto w-[min(260px,100%)] rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
        role="img"
        aria-label="QR code for judges to join"
        shapeRendering="crispEdges"
      >
        <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={box} height={box} fill="#ffffff" />
        <path d={qr.path} fill="#000000" />
      </svg>
      <p className="m-0 text-[15px] font-semibold">Judges: scan this with your phone camera</p>
      <p className={`${smallText} max-w-[320px] break-all`}>{link}</p>
      <button type="button" className={`${ghostButton} min-h-9 px-3.5 text-sm`} onClick={() => void copy()}>
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
    </div>
  );
}

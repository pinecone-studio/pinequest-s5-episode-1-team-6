'use client';

// A yes / no question in a modal window ("Start judging 2. Anu?"). Uses the browser's <dialog>:
// it keeps the keyboard focus inside, and Escape cancels.

import { useEffect, useRef, type ReactNode } from 'react';
import { bigButton, ghostButton, primaryButton } from '../ui';

interface ConfirmProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(460px,calc(100%-32px))] rounded-card border-0 bg-bg p-6 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop:bg-stage/50 open:animate-panel-in motion-reduce:animate-none"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title" className="m-0 font-display text-[26px] leading-tight">{title}</h2>
      {children && <div className="mt-3 text-[15px] text-muted">{children}</div>}
      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <button type="button" className={ghostButton} onClick={onCancel}>Cancel</button>
        <button type="button" className={`${primaryButton} ${bigButton} max-sm:w-full`} autoFocus onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

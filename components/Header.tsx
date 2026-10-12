import { AccountButton } from './AuthGate';
import { ghostButton } from './ui';

export type Tab = 'practice' | 'judge';

const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'judge', label: 'Judge' },
];

/** Name, the Practice / Judge tabs, the account and the Settings button. */
export function Header({ tab, onTab, onSettings }: { tab: Tab; onTab: (tab: Tab) => void; onSettings: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 border-b border-line px-[clamp(16px,4vw,40px)] py-[18px] print:hidden">
      <div>
        <h1 className="m-0 text-[26px] leading-tight font-bold text-accent">Rhymnast</h1>
        <p className="mt-0.5 mb-0 text-[15px] text-muted">See which points you lose in your balances, and why.</p>
      </div>
      <div className="order-3 flex w-full rounded-full bg-card p-1 sm:order-none sm:w-auto" role="tablist" aria-label="View">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => onTab(t.id)}
            className={`inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-[22px] text-base font-semibold sm:flex-none ${
              tab === t.id ? 'bg-bg text-ink shadow-[0_1px_4px_rgba(29,36,51,0.15)]' : 'bg-transparent text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <AccountButton />
        <button className={ghostButton} aria-controls="settings" onClick={onSettings}>Settings</button>
      </div>
    </header>
  );
}

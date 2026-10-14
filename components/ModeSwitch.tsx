import type { KeyboardEvent } from 'react';

export type Tab = 'practice' | 'judge';

const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'judge', label: 'Judge' },
];

/**
 * The Practice / Judge switch: two tabs in one pill, on top of the cards they change.
 * A white pill slides under the picked tab (none when people turned on "reduce motion").
 * Arrow keys move between the tabs (WAI-ARIA tabs pattern); only the picked tab is in the Tab order.
 */
export function ModeSwitch({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const id = TABS[(next + TABS.length) % TABS.length].id;
    onTab(id);
    document.getElementById(`tab-${id}`)?.focus();
  };

  const picked = TABS.findIndex((t) => t.id === tab);
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-card p-1" role="tablist" aria-label="View">
      {/* The sliding pill: half the track wide, moved one tab width per step. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-tab shadow-[0_1px_4px_rgba(29,36,51,0.15)] transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${picked * 100}%)` }}
      />
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={tab === t.id ? 0 : -1}
          onClick={() => onTab(t.id)}
          onKeyDown={onKey}
          className={`relative inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent px-4 text-base font-semibold transition-colors duration-150 motion-reduce:transition-none ${
            tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

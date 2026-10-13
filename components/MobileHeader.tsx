'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/app/apple-icon.png';
import type { Tab } from './Header';

const THEME_KEY = 'rhymnast.theme';

const svgProps = {
  className: 'size-5 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const UserIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const GearIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

const MoonIcon = () => (
  <svg {...svgProps}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const SunIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MenuIcon = () => (
  <svg {...svgProps}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg {...svgProps}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const roundBtn =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line transition hover:bg-black/5 dark:hover:bg-white/10';

const menuItem =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10';

export function MobileHeader({
  tab,
  onTab,
  onSettings,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  onSettings: () => void;
}) {
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Цэсийн гадна дарвал эсвэл Escape дарвал хаагдана
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch {}
  };

  return (
    <header className="relative z-30 flex flex-wrap items-center gap-x-2 gap-y-5 border-b border-line px-[clamp(16px,4vw,40px)] pt-6 pb-3 sm:hidden print:hidden">
      {/* Зүүн: зөвхөн logo */}
      <Link href="/" aria-label="Rhymnast" className="shrink-0">
        <Image src={logo} alt="Rhymnast" width={40} height={40} className="size-10 rounded-xl" priority />
      </Link>

      {/* Practice / Judge: доод мөрөнд, бүтэн өргөнөөр */}
      <div role="tablist" aria-label="Mode" className="order-3 flex w-full rounded-full border border-line p-1">
        {(['practice', 'judge'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => onTab(t)}
            className={`min-w-0 flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === t ? 'bg-accent/20 text-accent' : 'text-muted hover:text-[inherit]'
            }`}
          >
            {t === 'practice' ? 'Practice' : 'Judge'}
          </button>
        ))}
      </div>

      {/* Баруун бүлэг: Light/Dark switch (дээр нь шууд) + цэс (Sign in, Settings) */}
      <div className="order-2 ml-auto flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
          className={`relative h-10 w-[68px] shrink-0 overflow-hidden rounded-full border border-line transition-colors duration-500 ${
            dark ? 'bg-indigo-950' : 'bg-sky-300'
          }`}
        >
          {/* одод (dark үед) */}
          <span
            aria-hidden="true"
            className={`absolute left-3 top-2.5 size-1 rounded-full bg-white transition-opacity duration-500 ${dark ? 'opacity-90' : 'opacity-0'}`}
          />
          <span
            aria-hidden="true"
            className={`absolute left-6 top-6 size-0.5 rounded-full bg-white transition-opacity duration-500 ${dark ? 'opacity-70' : 'opacity-0'}`}
          />
          <span
            aria-hidden="true"
            className={`absolute left-4 top-[26px] size-1 rounded-full bg-white transition-opacity duration-500 ${dark ? 'opacity-80' : 'opacity-0'}`}
          />
          {/* гулсдаг сар / нар */}
          <span
            aria-hidden="true"
            className={`absolute left-1 top-1 flex size-8 items-center justify-center rounded-full shadow-md transition-all duration-500 ease-out ${
              dark ? 'translate-x-[28px] rotate-[360deg] bg-slate-100 text-indigo-900' : 'translate-x-0 rotate-0 bg-yellow-300 text-amber-600'
            }`}
          >
            {dark ? <MoonIcon /> : <SunIcon />}
          </span>
        </button>

        <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={roundBtn}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-line bg-white p-1.5 shadow-xl dark:bg-slate-900"
          >
            <Link href="/sign-in" role="menuitem" className={menuItem} onClick={() => setMenuOpen(false)}>
              <UserIcon /> Sign in
            </Link>
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setMenuOpen(false);
                onSettings();
              }}
            >
              <GearIcon /> Settings
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}

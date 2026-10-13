'use client';

// Password field with a Show / Hide button, so you can check what you typed on a phone.

import { useId, useState } from 'react';
import { input } from '../ui';

export function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div className="grid gap-1">
      <label className="text-sm font-semibold" htmlFor={id}>
        Password
      </label>
      <div className="relative">
        <input
          id={id}
          className={`${input} pr-20`}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          required
          minLength={6}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-1 my-auto h-9 cursor-pointer rounded-full border-0 bg-transparent px-3 text-sm font-semibold text-accent"
          aria-controls={id}
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

'use client';

// Input fields of the sign-in forms: a labelled text field, and a password field with Show / Hide.

import { useId, useState, type HTMLInputAutoCompleteAttribute } from 'react';
import { input } from '../ui';

export function TextField({
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: 'text' | 'email';
  autoComplete: HTMLInputAutoCompleteAttribute;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        className={input}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/** Password with a Show / Hide button, so you can check what you typed on a phone. `hint` shows under it. */
export function PasswordField({
  value,
  onChange,
  autoComplete,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
}) {
  const [shown, setShown] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;
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
          aria-describedby={hint ? hintId : undefined}
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
      {hint && (
        <p id={hintId} className="m-0 text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

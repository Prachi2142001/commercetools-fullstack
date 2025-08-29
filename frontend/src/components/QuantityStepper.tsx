"use client";
import { useCallback, useEffect, useState } from "react";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
};

export default function QuantityStepper({
  value,
  onChange,
  min = 1, // min for cart should be 1
  max,
  disabled = false,
  className = "",
}: Props) {
  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = useCallback(
    (raw: string) => {
      const digits = raw.replace(/[^\d]/g, "");
      if (digits === "") return setDraft(String(value));
      let next = parseInt(digits, 10);
      if (typeof max === "number") next = Math.min(next, max);
      next = Math.max(min, next);
      onChange(next);
    },
    [onChange, min, max, value]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^\d*$/.test(raw)) setDraft(raw);
  };
  const handleBlur = () => commit(draft);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit(draft);
      (e.target as HTMLInputElement).blur();
    }
  };

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () =>
    onChange(typeof max === "number" ? Math.min(max, value + 1) : value + 1);

  return (
    <div
      className={`flex items-center rounded-lg border-2 border-indigo-300 bg-gradient-to-r from-pink-100 via-indigo-50 to-yellow-100 shadow-md ${className}`}
    >
      <button
        type="button"
        onClick={dec}
        className="px-3 py-2 text-lg font-bold text-indigo-700 hover:text-pink-600"
        disabled={disabled}
      >
        –
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="\d*"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-16 border-x-2 border-indigo-200 text-center text-base font-semibold text-indigo-900 bg-white outline-none"
        aria-label="Quantity"
      />

      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className="px-3 py-2 text-lg font-bold text-indigo-700 hover:text-pink-600"
      >
        +
      </button>
    </div>
  );
}

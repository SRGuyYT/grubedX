"use client";

import { cn } from "@/lib/cn";

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border transition",
        checked ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/10 bg-white/5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block size-6 rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition",
          checked ? "translate-x-7" : "translate-x-1",
        )}
      />
    </button>
  );
}

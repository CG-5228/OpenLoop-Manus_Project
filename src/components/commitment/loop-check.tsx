"use client";

import { cn } from "@/lib/utils";

/**
 * Completion toggle styled as an open loop. Hovering previews the loop
 * closing; completing it fills the ring and draws a check.
 */
export function LoopCheck({
  checked,
  onToggle,
  label,
  disabled,
  size = "md",
  className,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const px = size === "lg" ? 28 : 22;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "group/loop relative z-10 inline-flex shrink-0 items-center justify-center rounded-full outline-offset-2 transition-transform active:scale-90 disabled:opacity-40",
        className,
      )}
      style={{ width: px, height: px }}
    >
      <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill={checked ? "var(--color-done)" : "transparent"}
          stroke={checked ? "var(--color-done)" : "var(--color-line-strong)"}
          strokeWidth="1.75"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={checked ? "100 0" : "82 18"}
          transform="rotate(-50 12 12)"
          className={cn(
            "transition-[stroke-dasharray,fill,stroke] duration-300 ease-out",
            !checked &&
              "group-hover/loop:stroke-ink-2 group-hover/loop:[stroke-dasharray:100_0]",
          )}
        />
        <path
          d="M7.8 12.3l2.7 2.7 5.7-5.9"
          fill="none"
          stroke={checked ? "white" : "var(--color-ink-2)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={checked ? 0 : 100}
          className={cn(
            "transition-[stroke-dashoffset] duration-300 ease-out",
            !checked && "opacity-0 group-hover/loop:opacity-60 group-hover/loop:[stroke-dashoffset:0]",
          )}
        />
      </svg>
    </button>
  );
}

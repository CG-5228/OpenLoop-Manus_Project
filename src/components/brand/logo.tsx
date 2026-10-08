import { cn } from "@/lib/utils";

/**
 * The OpenLoop mark: a ring with a gap — an open loop. When a commitment is
 * completed, the same ring closes (see <LoopCheck />).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-7", className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--color-ink)" />
      <path
        d="M21.6 10.4A8 8 0 1 0 24 16"
        stroke="var(--color-ink-inverse)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="24" cy="10.2" r="2.3" fill="var(--color-highlight)" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
          OpenLoop
        </span>
      )}
    </span>
  );
}

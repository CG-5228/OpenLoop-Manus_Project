import { RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Illustration: an open loop drawn with a dashed ring. */
function LoopIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden className={cn("size-20", className)}>
      <circle cx="48" cy="48" r="40" fill="var(--color-surface)" stroke="var(--color-line)" />
      <path
        d="M65 26a28 28 0 1 0 11 22"
        stroke="var(--color-ink)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="74" cy="31" r="6" fill="var(--color-highlight)" stroke="var(--color-ink)" strokeWidth="2" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-surface/50 text-center",
        compact ? "px-6 py-10" : "px-6 py-16 sm:py-20",
        className,
      )}
    >
      {!compact && <LoopIllustration className="mb-5" />}
      <h3 className={cn("font-semibold tracking-tight text-ink", compact ? "text-[15px]" : "text-lg")}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-[14px] border border-[#f3c9ca] bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-full bg-overdue-bg text-overdue-fg">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">{description}</p>
      )}
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}

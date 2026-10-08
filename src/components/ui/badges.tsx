import { ArrowDownLeft, ArrowUpRight, CircleHelp } from "lucide-react";
import type { Direction, Confidence } from "@/types/openloop";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type DisplayStatus } from "@/lib/ui/commitment-view";

const STATUS_STYLES: Record<DisplayStatus, { pill: string; dot: string }> = {
  pending: { pill: "bg-pending-bg text-pending-fg", dot: "bg-pending" },
  overdue: { pill: "bg-overdue-bg text-overdue-fg", dot: "bg-overdue" },
  needs_review: { pill: "bg-review-bg text-review-fg", dot: "bg-review" },
  completed: { pill: "bg-done-bg text-done-fg", dot: "bg-done" },
  dismissed: { pill: "bg-dismissed-bg text-dismissed-fg", dot: "bg-dismissed" },
};

export function StatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: DisplayStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-[13px]",
        s.pill,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          s.dot,
          status === "overdue" && "animate-pulse",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DirectionBadge({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  const config = {
    you_owe: { label: "You owe", Icon: ArrowUpRight },
    they_owe: { label: "Owed to you", Icon: ArrowDownLeft },
    unknown: { label: "Direction unclear", Icon: CircleHelp },
  }[direction];
  const { Icon } = config;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-2 text-xs font-medium text-ink-2",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {config.label}
    </span>
  );
}

/** Three-bar confidence meter, labelled for screen readers. */
export function ConfidenceMeter({
  confidence,
  showLabel = true,
  className,
}: {
  confidence: Confidence;
  showLabel?: boolean;
  className?: string;
}) {
  const level = { low: 1, medium: 2, high: 3 }[confidence];
  const tone = {
    low: "bg-review",
    medium: "bg-ink-2",
    high: "bg-done",
  }[confidence];
  const label = { low: "Low", medium: "Medium", high: "High" }[confidence];
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs text-ink-2", className)}
      aria-label={`${label} AI confidence`}
      role="img"
    >
      <span className="flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "w-[4px] rounded-full",
              i === 1 ? "h-2" : i === 2 ? "h-2.5" : "h-3",
              i <= level ? tone : "bg-muted",
            )}
          />
        ))}
      </span>
      {showLabel && <span className="font-medium">{label}</span>}
    </span>
  );
}

/** Marks fictional commitments from the simulated "Connect your apps" preview. */
export function PreviewDataBadge({ className }: { className?: string }) {
  return (
    <span
      title="Fictional data from the simulated app-connection preview — not from your conversations"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-line bg-subtle px-2 py-0.5 text-[11px] font-medium text-ink-3",
        className,
      )}
    >
      Preview data
    </span>
  );
}

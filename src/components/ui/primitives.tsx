import { cn } from "@/lib/utils";
import { avatarTone, initials } from "@/lib/ui/commitment-view";

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isYou = name === "You";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight ring-2 ring-surface",
        size === "sm" && "size-5 text-[9px]",
        size === "md" && "size-7 text-[11px]",
        size === "lg" && "size-10 text-sm",
        isYou ? "bg-ink text-ink-inverse" : avatarTone(name),
        className,
      )}
    >
      {isYou ? (size === "sm" ? "Y" : "You") : initials(name)}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-surface px-1 font-mono text-[11px] font-medium text-ink-3 shadow-[0_1px_0_var(--color-line)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

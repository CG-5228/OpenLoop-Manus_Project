"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CircleDashed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/ui/commitment-view";
import { dashboardHref } from "@/lib/ui/routes";
import { Skeleton } from "@/components/ui/primitives";

export function StatsBar({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      label: "Total open loops",
      value: stats.totalOpen,
      hint: stats.needsReview ? `${stats.needsReview} need review` : "All clear to review",
      href: dashboardHref({ view: "all" }),
      Icon: CircleDashed,
      accent: "bg-highlight text-highlight-ink",
    },
    {
      label: "You owe",
      value: stats.youOwe,
      hint: "Promises you made",
      href: dashboardHref({ view: "you-owe" }),
      Icon: ArrowUpRight,
      accent: "bg-subtle text-ink",
    },
    {
      label: "They owe you",
      value: stats.theyOwe,
      hint: "Promises made to you",
      href: dashboardHref({ view: "they-owe" }),
      Icon: ArrowDownLeft,
      accent: "bg-subtle text-ink",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      hint: stats.overdue ? "Past their deadline" : "Nothing late",
      href: dashboardHref({ view: "all", status: "overdue" }),
      Icon: Clock,
      accent: stats.overdue ? "bg-overdue-bg text-overdue-fg" : "bg-subtle text-ink-3",
      danger: stats.overdue > 0,
    },
  ];

  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, hint, href, Icon, accent, danger }) => (
        <Link
          key={label}
          href={href}
          className="group relative flex flex-col justify-between overflow-hidden rounded-[14px] border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-card-hover sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-ink-2">{label}</span>
            <span className={cn("inline-flex size-7 items-center justify-center rounded-lg", accent)}>
              <Icon className="size-4" aria-hidden />
            </span>
          </div>
          <div className="mt-4 sm:mt-6">
            <div
              className={cn(
                "font-display text-[44px] leading-none tracking-[-0.02em] tabular-nums sm:text-[52px]",
                danger ? "text-overdue-fg" : "text-ink",
              )}
            >
              {value}
            </div>
            <p className="mt-2 truncate text-xs text-ink-3">{hint}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}

export function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-[14px] border border-line bg-surface p-4 shadow-card sm:p-5">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
          <Skeleton className="mt-6 h-11 w-14" />
          <Skeleton className="mt-3 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

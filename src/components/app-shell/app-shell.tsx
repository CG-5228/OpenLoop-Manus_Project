"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FlaskConical,
  LayoutGrid,
  ListTodo,
  Menu as MenuIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SheetContent } from "@/components/ui/dialog";
import { computeStats, parseStatus, parseView, toSuggestionMap } from "@/lib/ui/commitment-view";
import { ROUTES, dashboardHref } from "@/lib/ui/routes";
import { useNow } from "@/lib/ui/use-now";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col border-r border-line bg-canvas lg:flex">
        <SidebarContents />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main id="main" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-1">
        <D.Root open={open} onOpenChange={setOpen}>
          <D.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <MenuIcon />
            </Button>
          </D.Trigger>
          <SheetContent title="Navigation">
            <SidebarContents onNavigate={() => setOpen(false)} />
          </SheetContent>
        </D.Root>
        <Link href={ROUTES.dashboard} aria-label="OpenLoop dashboard">
          <Logo />
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <DemoPill />
        <Button asChild variant="primary" size="icon" aria-label="Add conversation">
          <Link href={ROUTES.import}>
            <Plus />
          </Link>
        </Button>
      </div>
    </header>
  );
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="px-2 pb-5">
        <Link href={ROUTES.home} aria-label="OpenLoop home" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <Button asChild variant="primary" className="mx-1 justify-start">
        <Link href={ROUTES.import} onClick={onNavigate}>
          <Plus /> Add conversation
        </Link>
      </Button>

      <Suspense fallback={<NavLinks onNavigate={onNavigate} activeKey={null} />}>
        <ActiveNavLinks onNavigate={onNavigate} />
      </Suspense>

      <div className="mt-auto space-y-3 px-1">
        <DemoNotice />
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-ink-inverse">
            You
          </span>
          <div className="min-w-0 text-[13px] leading-tight">
            <p className="font-medium text-ink">Your workspace</p>
            <p className="truncate text-ink-3">Local to this browser</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type NavKey = "overview" | "you-owe" | "they-owe" | "all" | "needs_review" | "overdue";

function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  let activeKey: NavKey | null = null;
  if (pathname === ROUTES.dashboard) {
    const view = parseView(sp.get("view"));
    const status = parseStatus(sp.get("status"));
    if (view === "all" && status === "needs_review") activeKey = "needs_review";
    else if (view === "all" && status === "overdue") activeKey = "overdue";
    else activeKey = view;
  }
  return <NavLinks onNavigate={onNavigate} activeKey={activeKey} />;
}

function NavLinks({
  activeKey,
  onNavigate,
}: {
  activeKey: NavKey | null;
  onNavigate?: () => void;
}) {
  const api = useDashboardData();
  const now = useNow(60_000);
  const stats = useMemo(
    () => computeStats(api.commitments, now, toSuggestionMap(api.suggestions)),
    [api.commitments, api.suggestions, now],
  );
  const ready = api.state === "ready";

  const primary = [
    { key: "overview" as const, label: "Overview", href: dashboardHref(), Icon: LayoutGrid },
    { key: "you-owe" as const, label: "You owe", href: dashboardHref({ view: "you-owe" }), Icon: ArrowUpRight, count: stats.youOwe },
    { key: "they-owe" as const, label: "They owe you", href: dashboardHref({ view: "they-owe" }), Icon: ArrowDownLeft, count: stats.theyOwe },
    { key: "all" as const, label: "All commitments", href: dashboardHref({ view: "all" }), Icon: ListTodo, count: stats.totalOpen },
  ];
  const attention = [
    { key: "needs_review" as const, label: "Needs review", href: dashboardHref({ view: "all", status: "needs_review" }), Icon: Sparkles, count: stats.needsReview, tone: "review" },
    { key: "overdue" as const, label: "Overdue", href: dashboardHref({ view: "all", status: "overdue" }), Icon: Clock, count: stats.overdue, tone: "overdue" },
  ];

  const item = (i: {
    key: NavKey;
    label: string;
    href: string;
    Icon: typeof LayoutGrid;
    count?: number;
    tone?: string;
  }) => {
    const active = activeKey === i.key;
    return (
      <li key={i.key}>
        <Link
          href={i.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium transition-colors",
            active
              ? "bg-surface text-ink shadow-[0_1px_2px_rgb(26_25_21/0.06),0_0_0_1px_var(--color-line)]"
              : "text-ink-2 hover:bg-subtle hover:text-ink",
          )}
        >
          <i.Icon className={cn("size-4", active ? "text-ink" : "text-ink-3")} aria-hidden />
          <span className="flex-1 truncate">{i.label}</span>
          {ready && i.count !== undefined && i.count > 0 && (
            <span
              className={cn(
                "min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums",
                i.tone === "overdue"
                  ? "bg-overdue-bg font-semibold text-overdue-fg"
                  : i.tone === "review"
                    ? "bg-review-bg font-semibold text-review-fg"
                    : "text-ink-3",
              )}
            >
              {i.count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="mt-5 space-y-6">
      <ul className="space-y-0.5">{primary.map(item)}</ul>
      <div>
        <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Attention
        </p>
        <ul className="space-y-0.5">{attention.map(item)}</ul>
      </div>
    </nav>
  );
}

function DemoNotice() {
  const api = useDashboardData();
  const [confirming, setConfirming] = useState(false);
  if (api.mode === "demo") {
    return (
      <div className="rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-2 shadow-card">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
          <FlaskConical className="size-3.5" aria-hidden /> Demo mode
        </p>
        Showing synthetic conversations. Changes aren&apos;t saved yet.
      </div>
    );
  }
  const hasData = api.state === "ready" && api.commitments.length > 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-2 shadow-card">
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
        <FlaskConical className="size-3.5" aria-hidden /> Demo release
      </p>
      Rule-based extraction stands in for AI. Your loops are saved in this browser only.
      {hasData &&
        api.clearAll &&
        (confirming ? (
          <span className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="font-semibold text-overdue-fg hover:underline"
              onClick={() => {
                api.clearAll?.();
                setConfirming(false);
              }}
            >
              Delete all
            </button>
            <button type="button" className="text-ink-3 hover:text-ink" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="mt-2 block font-medium text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
            onClick={() => setConfirming(true)}
          >
            Clear saved data
          </button>
        ))}
    </div>
  );
}

function DemoPill() {
  const api = useDashboardData();
  if (api.mode !== "demo") return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-line bg-surface px-2 text-[11px] font-medium text-ink-2">
      <FlaskConical className="size-3" aria-hidden /> Demo
    </span>
  );
}

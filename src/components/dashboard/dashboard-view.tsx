"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CircleHelp, Plus, Sparkles } from "lucide-react";
import type { Commitment } from "@/types/openloop";
import { cn } from "@/lib/utils";
import {
  STATUS_FILTERS,
  computeStats,
  matchesQuery,
  matchesStatus,
  matchesView,
  parseSort,
  parseStatus,
  parseView,
  sortCommitments,
  toSuggestionMap,
  type SortKey,
  type StatusFilter,
  type SuggestionMap,
  type ViewKey,
} from "@/lib/ui/commitment-view";
import { ROUTES, dashboardHref } from "@/lib/ui/routes";
import { useNow } from "@/lib/ui/use-now";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { CommitmentCard, CommitmentCardSkeleton } from "@/components/commitment/commitment-card";
import { StatsBar, StatsBarSkeleton } from "@/components/dashboard/stats-bar";
import { SearchField, SortMenu, StatusChips } from "@/components/dashboard/toolbar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/primitives";

const VIEW_META: Record<ViewKey, { title: string; description: string }> = {
  overview: { title: "", description: "" },
  "you-owe": {
    title: "You owe",
    description: "Promises you've made to other people.",
  },
  "they-owe": {
    title: "They owe you",
    description: "Promises other people have made to you.",
  },
  all: {
    title: "All commitments",
    description: "Every promise OpenLoop has found, in one place.",
  },
};

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Update the query string without a server round-trip (keeps typing snappy). */
function writeParams(mutate: (sp: URLSearchParams) => void, mode: "push" | "replace" = "replace") {
  const sp = new URLSearchParams(window.location.search);
  mutate(sp);
  const qs = sp.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function DashboardView() {
  const api = useDashboardData();
  const now = useNow();
  const searchParams = useSearchParams();

  const view = parseView(searchParams.get("view"));
  const status = parseStatus(searchParams.get("status"));
  const sort = parseSort(searchParams.get("sort"));

  // Search is local state (instant) mirrored into the URL.
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const lastWritten = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery !== lastWritten.current) {
      lastWritten.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  const onQuery = useCallback((q: string) => {
    setQuery(q);
    lastWritten.current = q;
    writeParams((sp) => (q ? sp.set("q", q) : sp.delete("q")));
  }, []);
  const onStatus = useCallback((s: StatusFilter) => {
    writeParams((sp) => (s === "open" ? sp.delete("status") : sp.set("status", s)));
  }, []);
  const onSort = useCallback((s: SortKey) => {
    writeParams((sp) => (s === "due" ? sp.delete("sort") : sp.set("sort", s)));
  }, []);
  const onView = useCallback((v: ViewKey) => {
    writeParams((sp) => (v === "overview" ? sp.delete("view") : sp.set("view", v)), "push");
  }, []);
  const clearFilters = useCallback(() => {
    setQuery("");
    lastWritten.current = "";
    writeParams((sp) => {
      sp.delete("q");
      sp.delete("status");
    });
  }, []);

  const suggestionMap = useMemo(() => toSuggestionMap(api.suggestions), [api.suggestions]);
  const stats = useMemo(
    () => computeStats(api.commitments, now, suggestionMap),
    [api.commitments, now, suggestionMap],
  );

  const inView = useMemo(
    () => api.commitments.filter((c) => matchesView(c, view) && matchesQuery(c, query)),
    [api.commitments, view, query],
  );
  const counts = useMemo(() => {
    const out = {} as Record<StatusFilter, number>;
    for (const f of STATUS_FILTERS)
      out[f.key] = inView.filter((c) => matchesStatus(c, f.key, now, suggestionMap)).length;
    return out;
  }, [inView, now, suggestionMap]);
  const visible = useMemo(
    () =>
      sortCommitments(
        inView.filter((c) => matchesStatus(c, status, now, suggestionMap)),
        sort,
      ),
    [inView, status, sort, now, suggestionMap],
  );

  const meta = VIEW_META[view];
  const hasFilters = Boolean(query) || status !== "open";

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {view === "overview" ? (
            <>
              <p className="text-[13px] font-medium text-ink-3" suppressHydrationWarning>
                {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="mt-1 font-display text-[40px] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[48px]">
                {greeting(now)}.
              </h1>
              {api.state === "ready" ? (
                <p className="mt-2 text-[15px] text-ink-2">
                  {stats.totalOpen === 0 ? (
                    "No open loops. Nice work."
                  ) : (
                    <>
                      You have <span className="font-medium text-ink">{stats.totalOpen} open loop{stats.totalOpen === 1 ? "" : "s"}</span>
                      {stats.overdue > 0 && (
                        <>
                          , <span className="font-medium text-overdue-fg">{stats.overdue} overdue</span>
                        </>
                      )}
                      .
                    </>
                  )}
                </p>
              ) : (
                <Skeleton className="mt-3 h-4 w-56" />
              )}
            </>
          ) : (
            <>
              <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[48px]">
                {meta.title}
              </h1>
              <p className="mt-2 text-[15px] text-ink-2">{meta.description}</p>
            </>
          )}
        </div>
        <Button asChild variant="primary" size="lg" className="self-start sm:self-auto">
          <Link href={ROUTES.import}>
            <Plus /> Add conversation
          </Link>
        </Button>
      </header>

      <div className="mt-7 space-y-6 sm:mt-9">
        {api.state === "loading" && <DashboardSkeleton />}

        {api.state === "error" && (
          <ErrorState
            title="We couldn't load your commitments"
            description={api.error ?? "Something went wrong while loading. Your data hasn't been changed."}
            onRetry={api.reload}
          />
        )}

        {api.state === "ready" && api.commitments.length === 0 && (
          <EmptyState
            title="No open loops yet"
            description="Import a conversation and OpenLoop will find the promises inside it — who owes what, to whom, and by when."
            action={
              <>
                <Button asChild variant="primary">
                  <Link href={ROUTES.import}>
                    <Plus /> Add conversation
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`${ROUTES.import}?sample=1`}>Try the sample conversation</Link>
                </Button>
              </>
            }
          />
        )}

        {api.state === "ready" && api.commitments.length > 0 && (
          <>
            <StatsBar stats={stats} />

            {api.suggestions.length > 0 && (
              <ReviewBanner
                count={api.suggestions.length}
                onReview={() =>
                  writeParams((sp) => {
                    sp.set("view", "all");
                    sp.set("status", "needs_review");
                  }, "push")
                }
              />
            )}

            <div className="space-y-4">
              <ViewTabs view={view} onChange={onView} stats={stats} />
              <div className="flex gap-2">
                <SearchField value={query} onChange={onQuery} className="flex-1" />
                <SortMenu value={sort} onChange={onSort} />
              </div>
              <StatusChips value={status} onChange={onStatus} counts={counts} />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                compact
                title={query ? `No matches for “${query}”` : "Nothing here"}
                description={
                  hasFilters
                    ? "Try a different search or status filter."
                    : "There are no commitments in this section yet."
                }
                action={
                  hasFilters ? (
                    <Button size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : view === "overview" ? (
              <OverviewColumns list={visible} now={now} suggestions={suggestionMap} />
            ) : (
              <CardGrid list={visible} now={now} suggestions={suggestionMap} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function ViewTabs({
  view,
  onChange,
  stats,
}: {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  stats: ReturnType<typeof computeStats>;
}) {
  const tabs: { key: ViewKey; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "you-owe", label: "You owe", count: stats.youOwe },
    { key: "they-owe", label: "They owe you", count: stats.theyOwe },
    { key: "all", label: "All", count: stats.totalOpen },
  ];
  return (
    <nav aria-label="Dashboard sections" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-max rounded-xl border border-line bg-subtle p-1">
        {tabs.map((t) => {
          const active = view === t.key;
          return (
            <a
              key={t.key}
              href={dashboardHref({ view: t.key })}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                onChange(t.key);
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium transition-[background-color,color,box-shadow]",
                active
                  ? "bg-surface text-ink shadow-[0_1px_2px_rgb(26_25_21/0.08),0_0_0_1px_var(--color-line)]"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("tabular-nums text-[12px]", active ? "text-ink-3" : "text-ink-3/80")}>
                  {t.count}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function ReviewBanner({ count, onReview }: { count: number; onReview: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#e6ef9f] bg-highlight-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="flex items-start gap-2.5 text-sm text-ink">
        <span className="mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-highlight">
          <Sparkles className="size-3.5 text-highlight-ink" aria-hidden />
        </span>
        <span>
          <span className="font-medium">
            {count} commitment{count === 1 ? "" : "s"} may already be complete.
          </span>{" "}
          <span className="text-ink-2">New messages look like follow-through. Confirm before we close anything.</span>
        </span>
      </p>
      <Button size="sm" variant="primary" onClick={onReview} className="self-start sm:self-auto">
        Review <ArrowRight />
      </Button>
    </div>
  );
}

function CardGrid({
  list,
  now,
  suggestions,
}: {
  list: Commitment[];
  now: Date;
  suggestions: SuggestionMap;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {list.map((c, i) => (
        <CommitmentCard key={c.id} commitment={c} suggestion={suggestions.get(c.id)} now={now} index={i} />
      ))}
    </div>
  );
}

const COLUMN_LIMIT = 5;

function OverviewColumns({
  list,
  now,
  suggestions,
}: {
  list: Commitment[];
  now: Date;
  suggestions: SuggestionMap;
}) {
  const youOwe = list.filter((c) => c.direction === "you_owe");
  const theyOwe = list.filter((c) => c.direction === "they_owe");
  const unclear = list.filter((c) => c.direction === "unknown");

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
        <Column
          title="You owe"
          subtitle="Promises you made"
          icon={<ArrowUpRight className="size-4" aria-hidden />}
          list={youOwe}
          href={dashboardHref({ view: "you-owe" })}
          now={now}
          suggestions={suggestions}
          emptyText="You're not holding anyone up. Nice."
        />
        <Column
          title="They owe you"
          subtitle="Promises made to you"
          icon={<ArrowDownLeft className="size-4" aria-hidden />}
          list={theyOwe}
          href={dashboardHref({ view: "they-owe" })}
          now={now}
          suggestions={suggestions}
          emptyText="Nobody owes you anything right now."
        />
      </div>
      {unclear.length > 0 && (
        <Column
          title="Unclear direction"
          subtitle="OpenLoop isn't sure who owes whom — review these"
          icon={<CircleHelp className="size-4" aria-hidden />}
          list={unclear}
          href={dashboardHref({ view: "all", status: "needs_review" })}
          now={now}
          suggestions={suggestions}
          emptyText=""
          wide
        />
      )}
    </div>
  );
}

function Column({
  title,
  subtitle,
  icon,
  list,
  href,
  now,
  suggestions,
  emptyText,
  wide,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  list: Commitment[];
  href: string;
  now: Date;
  suggestions: SuggestionMap;
  emptyText: string;
  wide?: boolean;
}) {
  const shown = list.slice(0, COLUMN_LIMIT);
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 items-center justify-center rounded-lg border border-line bg-surface text-ink">
            {icon}
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              {title} <span className="ml-0.5 font-normal tabular-nums text-ink-3">{list.length}</span>
            </h2>
            <p className="text-xs text-ink-3">{subtitle}</p>
          </div>
        </div>
        {list.length > 0 && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <EmptyState compact title="All clear" description={emptyText} />
      ) : (
        <div className={cn("grid gap-3", wide && "lg:grid-cols-2")}>
          {shown.map((c, i) => (
            <CommitmentCard key={c.id} commitment={c} suggestion={suggestions.get(c.id)} now={now} index={i} />
          ))}
          {list.length > COLUMN_LIMIT && (
            <Link
              href={href}
              className="flex h-11 items-center justify-center rounded-[14px] border border-dashed border-line-strong text-[13px] font-medium text-ink-2 hover:bg-surface hover:text-ink"
            >
              Show {list.length - COLUMN_LIMIT} more
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading commitments">
      <StatsBarSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
        <Skeleton className="h-9 w-full rounded-[10px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-7 w-40" />
            <CommitmentCardSkeleton />
            <CommitmentCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CircleSlash,
  Copy,
  Ellipsis,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import type { Commitment, CompletionSuggestion } from "@/types/openloop";
import { cn } from "@/lib/utils";
import {
  formatDue,
  getCounterparty,
  getDisplayStatus,
  getReviewReasons,
} from "@/lib/ui/commitment-view";
import { ROUTES } from "@/lib/ui/routes";
import { Avatar } from "@/components/ui/primitives";
import { ConfidenceMeter, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { LoopCheck } from "@/components/commitment/loop-check";
import { FollowUpDialog } from "@/components/commitment/follow-up-dialog";
import { DeadlineDialog } from "@/components/commitment/deadline-dialog";
import { useCommitmentActions } from "@/components/commitment/use-commitment-actions";
import { useRouter } from "next/navigation";

const DUE_TONE = {
  none: "text-ink-3",
  overdue: "text-overdue-fg",
  soon: "text-review-fg",
  later: "text-ink-2",
  done: "text-ink-3",
} as const;

export function PersonLine({ commitment: c }: { commitment: Commitment }) {
  const person = getCounterparty(c);
  const prefix =
    c.direction === "you_owe" ? "To" : c.direction === "they_owe" ? "From" : "By";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar name={person} size="sm" />
      <span className="truncate">
        <span className="text-ink-3">{prefix} </span>
        <span className="font-medium text-ink">{person}</span>
      </span>
    </span>
  );
}

export function CommitmentCard({
  commitment: c,
  suggestion,
  now,
  index = 0,
}: {
  commitment: Commitment;
  suggestion?: CompletionSuggestion;
  now: Date;
  index?: number;
}) {
  const actions = useCommitmentActions();
  const router = useRouter();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const status = getDisplayStatus(c, now, suggestion);
  const due = formatDue(c, now);
  const reasons = getReviewReasons(c, suggestion);
  const isPending = c.status === "pending";
  const evidenceBy = c.direction === "you_owe" ? "You" : c.promisor;

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className={cn(
        "group relative flex animate-rise flex-col rounded-[14px] border border-line bg-surface p-4 shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:border-line-strong hover:shadow-card-hover sm:p-[18px]",
        c.status === "dismissed" && "bg-surface/60",
      )}
    >
      <div className="flex flex-1 gap-3">
        <div className="pt-px">
          <LoopCheck
            checked={c.status === "completed"}
            disabled={c.status === "dismissed"}
            onToggle={() => actions.toggleComplete(c)}
            label={c.status === "completed" ? `Mark "${c.title}" as pending` : `Mark "${c.title}" as completed`}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={cn(
                "text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink",
                c.status === "completed" && "text-ink-3 line-through decoration-ink-3/60",
                c.status === "dismissed" && "text-ink-3",
              )}
            >
              <Link
                href={ROUTES.commitment(c.id)}
                className="outline-none after:absolute after:inset-0 after:rounded-[14px] after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-ink"
              >
                {c.title}
              </Link>
            </h3>
            <StatusBadge status={status} className="-mt-px" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-ink-2">
            <PersonLine commitment={c} />
            <span className={cn("inline-flex items-center gap-1.5", DUE_TONE[due.tone])}>
              <CalendarClock className="size-3.5 opacity-80" aria-hidden />
              <span className="font-medium">{due.label}</span>
              {due.relative && <span className="opacity-80">· {due.relative}</span>}
            </span>
            {c.confidence !== "high" && (
              <ConfidenceMeter confidence={c.confidence} className="text-[12px]" />
            )}
          </div>

          <figure className="mt-3">
            <blockquote className="line-clamp-2 border-l-[3px] border-highlight pl-3 text-[13px] leading-relaxed text-ink-2">
              &ldquo;{c.evidenceQuote}&rdquo;
            </blockquote>
            <figcaption className="mt-1 pl-[15px] text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
              {evidenceBy}
            </figcaption>
          </figure>

          {suggestion && isPending && (
            <div className="relative z-10 mt-3 rounded-[10px] border border-[#f5e0b0] bg-review-bg/70 p-3">
              <p className="flex items-start gap-2 text-[13px] leading-snug text-ink">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-review-fg" aria-hidden />
                <span>
                  <span className="font-medium">{c.promisor} may have completed this.</span>{" "}
                  <span className="text-ink-2">&ldquo;{suggestion.evidenceQuote}&rdquo;</span>
                </span>
              </p>
              <div className="mt-2.5 flex gap-2 pl-[22px]">
                <Button size="sm" variant="primary" onClick={() => actions.confirmSuggestion(c)}>
                  Confirm complete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => actions.rejectSuggestion(c)}>
                  Not yet
                </Button>
              </div>
            </div>
          )}

          {!suggestion && reasons.length > 0 && (
            <p className="mt-2.5 text-[12px] font-medium text-review-fg">
              {reasons.join(" · ")} — check the evidence.
            </p>
          )}

          <div aria-hidden className="min-h-3 flex-1" />
          <div className="relative z-10 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
            <div className="-ml-2 flex items-center gap-0.5">
              {isPending ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setFollowUpOpen(true)}>
                    <MessageSquareText /> Follow up
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Change deadline" onClick={() => setDeadlineOpen(true)}>
                    <CalendarClock /> <span className="hidden min-[400px]:inline">Deadline</span>
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => actions.restore(c)}>
                  <RotateCcw /> Restore
                </Button>
              )}
            </div>

            <Menu>
              <MenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${c.title}`}>
                  <Ellipsis />
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<ArrowUpRight />} onSelect={() => router.push(ROUTES.commitment(c.id))}>
                  Open details
                </MenuItem>
                <MenuItem icon={<Copy />} onSelect={() => actions.copyText(c.evidenceQuote, "Evidence copied")}>
                  Copy evidence
                </MenuItem>
                <MenuSeparator />
                {isPending ? (
                  <>
                    <MenuItem icon={<CircleCheck />} onSelect={() => actions.complete(c)}>
                      Mark completed
                    </MenuItem>
                    <MenuItem icon={<CalendarClock />} onSelect={() => setDeadlineOpen(true)}>
                      Change deadline
                    </MenuItem>
                    <MenuItem icon={<MessageSquareText />} onSelect={() => setFollowUpOpen(true)}>
                      Draft follow-up
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem destructive icon={<CircleSlash />} onSelect={() => actions.dismiss(c)}>
                      Dismiss — not a commitment
                    </MenuItem>
                  </>
                ) : (
                  <MenuItem icon={<RotateCcw />} onSelect={() => actions.restore(c)}>
                    Restore to pending
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
          </div>
        </div>
      </div>

      <FollowUpDialog commitment={c} open={followUpOpen} onOpenChange={setFollowUpOpen} />
      <DeadlineDialog commitment={c} open={deadlineOpen} onOpenChange={setDeadlineOpen} />
    </article>
  );
}

export function CommitmentCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4 shadow-card sm:p-[18px]">
      <div className="flex gap-3">
        <div className="skeleton size-[22px] rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between gap-6">
            <div className="skeleton h-4 w-3/5" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="skeleton h-3 w-2/5" />
          <div className="skeleton h-3 w-11/12" />
          <div className="flex gap-2 border-t border-line/70 pt-3">
            <div className="skeleton h-6 w-20" />
            <div className="skeleton h-6 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

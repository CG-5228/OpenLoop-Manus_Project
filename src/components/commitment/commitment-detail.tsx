"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  CircleSlash,
  Copy,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Commitment, CompletionSuggestion, Message } from "@/types/openloop";
import { cn } from "@/lib/utils";
import {
  CONFIDENCE_LABEL,
  formatDue,
  formatFullDate,
  getDisplayStatus,
  getReviewReasons,
  isPreviewCommitment,
} from "@/lib/ui/commitment-view";
import { ROUTES } from "@/lib/ui/routes";
import { useNow } from "@/lib/ui/use-now";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { useCommitmentActions } from "@/components/commitment/use-commitment-actions";
import { FollowUpDialog } from "@/components/commitment/follow-up-dialog";
import { DeadlineDialog } from "@/components/commitment/deadline-dialog";
import { ConfidenceMeter, DirectionBadge, PreviewDataBadge, StatusBadge } from "@/components/ui/badges";
import { Avatar, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";

const SOURCE_LABEL: Record<Message["source"], string> = {
  paste: "Pasted chat",
  txt: "Text file",
  image: "Screenshot",
};

const CONFIDENCE_EXPLAINER = {
  high: "The message contains a clear, definite promise.",
  medium: "The promise is clear, but some details — like timing or scope — are vague.",
  low: "The wording is tentative, so this may not be a real commitment. Check the evidence before relying on it.",
} as const;

export function CommitmentDetail({ id }: { id: string }) {
  const api = useDashboardData();
  const now = useNow();
  const commitment = api.getCommitment(id);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <Link
        href={ROUTES.dashboard}
        className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Dashboard
      </Link>

      {api.state === "loading" && <DetailSkeleton />}
      {api.state === "error" && (
        <ErrorState
          className="mt-8"
          title="We couldn't load this commitment"
          description={api.error ?? undefined}
          onRetry={api.reload}
        />
      )}
      {api.state === "ready" && !commitment && (
        <EmptyState
          className="mt-8"
          title="Commitment not found"
          description="It may have been removed, or the link is out of date."
          action={
            <Button asChild variant="primary">
              <Link href={ROUTES.dashboard}>Back to dashboard</Link>
            </Button>
          }
        />
      )}
      {api.state === "ready" && commitment && (
        <DetailBody
          commitment={commitment}
          now={now}
          suggestion={api.suggestions.find((s) => s.commitmentId === commitment.id)}
          message={api.getMessage(commitment.sourceMessageId)}
          getMessage={api.getMessage}
        />
      )}
    </div>
  );
}

function DetailBody({
  commitment: c,
  now,
  suggestion,
  message,
  getMessage,
}: {
  commitment: Commitment;
  now: Date;
  suggestion?: CompletionSuggestion;
  message?: Message;
  getMessage: (id: string) => Message | undefined;
}) {
  const actions = useCommitmentActions();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const status = getDisplayStatus(c, now, suggestion);
  const due = formatDue(c, now);
  const reasons = getReviewReasons(c, suggestion);
  const isPending = c.status === "pending";
  const isPreview = isPreviewCommitment(c);
  const promisorLabel = c.direction === "you_owe" ? "You" : c.promisor;
  const beneficiaryLabel =
    c.direction === "they_owe" ? "You" : (c.beneficiary ?? "Not specified");

  const summary =
    c.direction === "you_owe"
      ? `${c.beneficiary ?? "Someone"} is counting on you for this.`
      : c.direction === "they_owe"
        ? `${c.promisor} promised this to you.`
        : `${c.promisor} said this, but it's unclear who it's for.`;

  return (
    <div className="animate-fade-in">
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} size="md" />
          <DirectionBadge direction={c.direction} className="h-7" />
          {isPreview && <PreviewDataBadge className="h-7 px-2.5 text-[12px]" />}
        </div>
        <h1
          className={cn(
            "mt-4 font-display text-[36px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[46px]",
            c.status === "completed" && "text-ink-3 line-through decoration-2 decoration-ink-3/50",
          )}
        >
          {c.title}
        </h1>
        <p className="mt-2 text-[15px] text-ink-2">{summary}</p>
        {reasons.length > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-review-bg px-2.5 py-1.5 text-[13px] font-medium text-review-fg">
            <Sparkles className="size-3.5" aria-hidden /> {reasons.join(" · ")}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {suggestion && isPending && (
            <section
              aria-label="Completion evidence"
              className="rounded-[14px] border border-[#f1dca8] bg-review-bg/60 p-5"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-review text-white">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-ink">
                    {c.promisor === "Me" || c.direction === "you_owe" ? "You" : c.promisor} may have completed this commitment
                  </h2>
                  <p className="mt-1 text-sm text-ink-2">{suggestion.reason}</p>
                  <MessageBubble
                    className="mt-4"
                    message={getMessage(suggestion.sourceMessageId)}
                    quote={suggestion.evidenceQuote}
                    fallbackSender={c.promisor}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="primary" size="sm" onClick={() => actions.confirmSuggestion(c)}>
                      <CircleCheck /> Confirm complete
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => actions.rejectSuggestion(c)}>
                      Not yet — keep open
                    </Button>
                    <ConfidenceMeter confidence={suggestion.confidence} className="ml-1" />
                  </div>
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="evidence-heading" className="rounded-[14px] border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="evidence-heading" className="text-[15px] font-semibold text-ink">
                Original message
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => actions.copyText(c.evidenceQuote, "Evidence copied")}
              >
                <Copy /> Copy quote
              </Button>
            </div>
            <MessageBubble className="mt-4" message={message} quote={c.evidenceQuote} fallbackSender={c.promisor} />
            <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-3">
              <ShieldCheck className="size-3.5" aria-hidden />
              {isPreview
                ? "Fictional message from the simulated app-connection preview — not from your conversations."
                : "Quoted exactly from your imported conversation — never paraphrased."}
            </p>
          </section>

          <section aria-labelledby="confidence-heading" className="rounded-[14px] border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="confidence-heading" className="text-[15px] font-semibold text-ink">
                AI confidence
              </h2>
              <ConfidenceMeter confidence={c.confidence} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{CONFIDENCE_EXPLAINER[c.confidence]}</p>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section aria-label="Details" className="rounded-[14px] border border-line bg-surface shadow-card">
            <dl className="divide-y divide-line/80">
              <Row label="Responsible">
                <span className="inline-flex items-center gap-2">
                  <Avatar name={promisorLabel} size="sm" /> {promisorLabel}
                </span>
              </Row>
              <Row label="Recipient">
                <span className="inline-flex items-center gap-2">
                  {c.beneficiary || c.direction === "they_owe" ? <Avatar name={beneficiaryLabel} size="sm" /> : null}
                  <span className={cn(!c.beneficiary && c.direction !== "they_owe" && "text-ink-3")}>{beneficiaryLabel}</span>
                </span>
              </Row>
              <Row label="Deadline">
                <div className="text-right">
                  <p className={cn(due.tone === "overdue" && "text-overdue-fg", !c.dueAt && "text-ink-3")}>
                    {c.dueAt ? formatFullDate(c.dueAt) : "No deadline mentioned"}
                  </p>
                  {due.relative && (
                    <p className={cn("text-xs", due.tone === "overdue" ? "text-overdue-fg" : "text-ink-3")}>
                      {due.relative}
                    </p>
                  )}
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => setDeadlineOpen(true)}
                      className="mt-1 text-xs font-medium text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
                    >
                      {c.dueAt ? "Change" : "Add deadline"}
                    </button>
                  )}
                </div>
              </Row>
              <Row label="Status">
                <StatusBadge status={status} />
              </Row>
              <Row label="Confidence">
                <span className="text-sm">{CONFIDENCE_LABEL[c.confidence]}</span>
              </Row>
            </dl>
          </section>

          <section aria-label="Actions" className="space-y-2 rounded-[14px] border border-line bg-surface p-3 shadow-card">
            {isPending ? (
              <>
                <Button variant="primary" className="w-full justify-start" onClick={() => actions.complete(c)}>
                  <CircleCheck /> Mark completed
                </Button>
                <Button className="w-full justify-start" onClick={() => setFollowUpOpen(true)}>
                  <MessageSquareText /> Draft follow-up
                </Button>
                <Button className="w-full justify-start" onClick={() => setDeadlineOpen(true)}>
                  <CalendarClock /> Change deadline
                </Button>
                <Button variant="danger" className="w-full justify-start" onClick={() => actions.dismiss(c)}>
                  <CircleSlash /> Dismiss — not a commitment
                </Button>
              </>
            ) : (
              <>
                <p className="px-1 pb-1 pt-0.5 text-[13px] text-ink-2">
                  {c.status === "completed" ? "This loop is closed." : "This was dismissed and isn't tracked."}
                </p>
                <Button className="w-full justify-start" onClick={() => actions.restore(c)}>
                  <RotateCcw /> Restore to pending
                </Button>
              </>
            )}
          </section>
        </aside>
      </div>

      <FollowUpDialog commitment={c} open={followUpOpen} onOpenChange={setFollowUpOpen} />
      <DeadlineDialog commitment={c} open={deadlineOpen} onOpenChange={setDeadlineOpen} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <dt className="pt-0.5 text-[13px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

/** Renders the source message with the evidence quote highlighted in place. */
function MessageBubble({
  message,
  quote,
  fallbackSender,
  className,
}: {
  message?: Message;
  quote: string;
  fallbackSender: string;
  className?: string;
}) {
  const sender = message?.sender ?? fallbackSender;
  const senderLabel = sender === "Me" ? "You" : sender;
  const text = message?.text ?? quote;
  const idx = text.toLowerCase().indexOf(quote.toLowerCase());
  const parts =
    idx >= 0
      ? [text.slice(0, idx), text.slice(idx, idx + quote.length), text.slice(idx + quote.length)]
      : null;
  const sent = message?.sentAt ? formatFullDate(message.sentAt) : null;

  return (
    <figure className={cn("flex gap-3", className)}>
      <Avatar name={senderLabel} />
      <div className="min-w-0 flex-1">
        <figcaption className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
          <span className="font-semibold text-ink">{senderLabel}</span>
          {sent && <span className="text-xs text-ink-3">{sent}</span>}
          {message && <span className="text-xs text-ink-3">· {SOURCE_LABEL[message.source]}</span>}
        </figcaption>
        <blockquote className="mt-1.5 rounded-2xl rounded-tl-md border border-line bg-subtle/70 px-4 py-3 text-[15px] leading-relaxed text-ink">
          {parts ? (
            <>
              {parts[0]}
              <mark className="highlight-mark text-ink">{parts[1]}</mark>
              {parts[2]}
            </>
          ) : (
            <mark className="highlight-mark text-ink">{text}</mark>
          )}
        </blockquote>
      </div>
    </figure>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-6" aria-busy="true" aria-label="Loading commitment">
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-11 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/3" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-52 rounded-[14px]" />
        <Skeleton className="h-72 rounded-[14px]" />
      </div>
    </div>
  );
}

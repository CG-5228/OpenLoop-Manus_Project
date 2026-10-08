"use client";

import Link from "next/link";
import { ArrowLeft, Check, Loader2, Quote, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/ui/routes";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ImporterSlot } from "@/components/import-flow/importer-slot";
import { useImportFlow, type ImportPhase } from "@/components/import-flow/use-import-flow";
import type { ExtractionMode } from "@/lib/ui/api-client";

const STEPS = ["Import", "Analyse", "Review"] as const;

function stepIndex(phase: ImportPhase) {
  return phase.kind === "idle" ? 0 : 1;
}

export function ImportView({ extractionMode }: { extractionMode: ExtractionMode }) {
  const flow = useImportFlow();
  const { phase } = flow;
  const current = stepIndex(phase);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <Link
        href={ROUTES.dashboard}
        className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Dashboard
      </Link>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[38px] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[48px]">
            Add a conversation
          </h1>
          <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-ink-2">
            OpenLoop finds the promises inside it — who owes what, to whom, and by when — and keeps the
            original message as proof.
          </p>
        </div>
        <ol aria-label="Progress" className="flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              <span
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors",
                  i < current && "bg-done-bg text-done-fg",
                  i === current && "bg-ink text-ink-inverse",
                  i > current && "border border-line bg-surface text-ink-3",
                )}
              >
                {i < current ? <Check className="size-3.5" aria-hidden /> : <span className="font-mono">{i + 1}</span>}
                {label}
              </span>
              {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-line-strong" />}
            </li>
          ))}
        </ol>
      </header>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <section aria-live="polite" aria-busy={phase.kind === "analysing"}>
          {/* Kept mounted so the pasted conversation survives an error or a retry. */}
          <div hidden={phase.kind !== "idle"}>
            <ImporterSlot onImport={flow.onImport} extractionMode={extractionMode} />
          </div>

          {phase.kind === "analysing" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[18px] border border-line bg-surface p-8 text-center shadow-card">
              <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-highlight/60">
                <Loader2 className="size-6 animate-spin text-ink" aria-hidden />
              </span>
              <h2 className="mt-6 text-[17px] font-semibold tracking-tight text-ink">
                Finding commitments in {phase.messageCount} message{phase.messageCount === 1 ? "" : "s"}…
              </h2>
              <p className="mt-1.5 max-w-[380px] text-[14px] leading-relaxed text-ink-2">
                Separating real promises from maybes and small talk.
                {extractionMode === "ai" ? " This usually takes a few seconds." : ""}
              </p>
              <Button variant="ghost" size="sm" className="mt-6" onClick={flow.cancel}>
                Cancel
              </Button>
            </div>
          )}

          {phase.kind === "empty" && (
            <EmptyState
              title="No commitments found"
              description="OpenLoop didn't find any definite promises in this conversation. Tentative statements like “I might…” aren't tracked."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="primary" onClick={flow.reset}>
                    Try another conversation
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={ROUTES.dashboard}>Go to dashboard</Link>
                  </Button>
                </div>
              }
            />
          )}

          {phase.kind === "error" && (
            <div>
              <ErrorState
                title="We couldn't analyse this conversation"
                description={<>{phase.message} Nothing was saved.</>}
                onRetry={flow.retry}
              />
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={flow.reset}>
                  Edit the conversation
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[18px] border border-line bg-surface p-5 shadow-card">
            <h2 className="text-[13px] font-semibold text-ink">What OpenLoop looks for</h2>
            <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-ink-2">
              <li className="flex gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                Definite promises like “I&apos;ll send it tomorrow” — not “I might”.
              </li>
              <li className="flex gap-2.5">
                <UserRound className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                Who made the promise and who it&apos;s for, based on the sender you pick as you.
              </li>
              <li className="flex gap-2.5">
                <Quote className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                The exact message as evidence. Deadlines are only set when the chat supports them.
              </li>
            </ul>
          </div>
          <p className="flex gap-2 px-1 text-[12px] leading-relaxed text-ink-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {extractionMode === "ai"
              ? "Your conversation is sent to OpenLoop’s AI provider only when you choose to analyse it."
              : "Demo extraction runs on OpenLoop’s server with rules, not AI. Nothing is stored on the server."}{" "}
            Results are saved in this browser only. Use fictional or non-sensitive messages for demos.
          </p>
        </aside>
      </div>
    </div>
  );
}

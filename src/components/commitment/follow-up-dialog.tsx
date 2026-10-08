"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Copy, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Commitment } from "@/types/openloop";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { useCommitmentActions } from "@/components/commitment/use-commitment-actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";

type Phase = "loading" | "ready" | "error";

export function FollowUpDialog({
  commitment,
  open,
  onOpenChange,
}: {
  commitment: Commitment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recipient =
    commitment.direction === "you_owe"
      ? (commitment.beneficiary ?? "them")
      : commitment.promisor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Follow up with ${recipient}`}
        description={
          <>
            A draft based on <span className="font-medium text-ink">{commitment.title}</span>.
            Edit it before you send it.
          </>
        }
      >
        {/* Mounted only while open, so each opening drafts a fresh message. */}
        {open && <FollowUpBody commitment={commitment} />}
      </DialogContent>
    </Dialog>
  );
}

function FollowUpBody({ commitment }: { commitment: Commitment }) {
  const api = useDashboardData();
  const actions = useCommitmentActions();
  const [phase, setPhase] = useState<Phase>("loading");
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState<"ai" | "template" | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestDraft = useEffectEvent(() => api.generateFollowUp(commitment));

  useEffect(() => {
    let cancelled = false;
    requestDraft().then(
      (result) => {
        if (cancelled) return;
        setDraft(result.message);
        setSource(result.source);
        setPhase("ready");
      },
      () => {
        if (!cancelled) setPhase("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [commitment.id, attempt]);

  const regenerate = () => {
    setPhase("loading");
    setAttempt((a) => a + 1);
  };

  return (
    <>
      {phase === "ready" && source === "template" && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-review-bg px-2 py-1 text-xs font-medium text-review-fg">
          <TriangleAlert className="size-3.5" aria-hidden />
          Drafted from a template, not AI. Review it before sending.
        </p>
      )}

      <div aria-live="polite" aria-busy={phase === "loading"}>
        {phase === "loading" && (
          <div className="space-y-2.5 rounded-xl border border-line bg-subtle/60 p-4">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <p className="pt-1 text-xs text-ink-3">Drafting a follow-up…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-xl border border-[#f3c9ca] bg-overdue-bg p-4 text-sm">
            <p className="font-medium text-overdue-fg">We couldn&apos;t draft a follow-up.</p>
            <p className="mt-1 text-ink-2">The service didn&apos;t respond. Your commitment is unchanged.</p>
            <Button size="sm" className="mt-3" onClick={regenerate}>
              <RotateCcw /> Try again
            </Button>
          </div>
        )}

        {phase === "ready" && (
          <label className="block">
            <span className="sr-only">Follow-up message</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-line bg-surface p-4 text-[15px] leading-relaxed text-ink shadow-card outline-none transition-colors focus:border-ink-3"
            />
          </label>
        )}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck className="size-3.5" aria-hidden />
          OpenLoop never sends messages for you.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={regenerate} disabled={phase === "loading"}>
            <RotateCcw /> Regenerate
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={phase !== "ready" || !draft.trim()}
            onClick={() => actions.copyText(draft, "Follow-up copied")}
          >
            <Copy /> Copy message
          </Button>
        </div>
      </div>
    </>
  );
}

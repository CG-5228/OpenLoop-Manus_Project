"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import type { Commitment } from "@/types/openloop";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { formatFullDate } from "@/lib/ui/commitment-view";

/**
 * UI-level action wrappers: call the DashboardDataApi and give consistent
 * feedback (toasts with undo). Persistence stays with Member 4.
 */
export function useCommitmentActions() {
  const api = useDashboardData();

  return useMemo(() => {
    const complete = (c: Commitment) => {
      api.markCompleted(c.id);
      toast.success("Loop closed", {
        description: c.title,
        action: { label: "Undo", onClick: () => api.restore(c.id) },
      });
    };
    const restore = (c: Commitment) => {
      api.restore(c.id);
      toast("Moved back to pending", { description: c.title });
    };
    return {
      complete,
      restore,
      dismiss(c: Commitment) {
        api.dismiss(c.id);
        toast("Commitment dismissed", {
          description: "It won't count towards your open loops.",
          action: { label: "Undo", onClick: () => api.restore(c.id) },
        });
      },
      toggleComplete(c: Commitment) {
        if (c.status === "completed") restore(c);
        else complete(c);
      },
      updateDeadline(c: Commitment, dueAt: string | null) {
        const previous = c.dueAt;
        api.updateDeadline(c.id, dueAt);
        toast.success(dueAt ? "Deadline updated" : "Deadline removed", {
          description: dueAt ? (formatFullDate(dueAt) ?? undefined) : c.title,
          action: { label: "Undo", onClick: () => api.updateDeadline(c.id, previous) },
        });
      },
      confirmSuggestion(c: Commitment) {
        api.confirmSuggestion(c.id);
        toast.success("Confirmed as complete", {
          description: c.title,
          action: { label: "Undo", onClick: () => api.restore(c.id) },
        });
      },
      rejectSuggestion(c: Commitment) {
        api.rejectSuggestion(c.id);
        toast("Kept open", { description: "We'll keep tracking this commitment." });
      },
      async copyText(text: string, what = "Copied to clipboard") {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(what);
        } catch {
          toast.error("Couldn't access the clipboard", {
            description: "Select the text and copy it manually.",
          });
        }
      },
    };
  }, [api]);
}

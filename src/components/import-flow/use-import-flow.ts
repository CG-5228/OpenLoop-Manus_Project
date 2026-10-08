"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Commitment, Message } from "@/types/openloop";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { ApiError, extractCommitments, type ExtractionMode } from "@/lib/ui/api-client";
import { ROUTES } from "@/lib/ui/routes";

/**
 * Structurally identical to Member 2's `ConversationImportPayload`
 * (src/lib/conversation/types.ts on feature/conversation).
 */
export interface ImportPayload {
  messages: Message[];
  currentUserLabel: string;
  referenceDate?: string;
}

export type ImportPhase =
  | { kind: "idle" }
  | { kind: "analysing"; messageCount: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * Import → AI extraction (Member 3's endpoint) → storage (Member 4 via the
 * dashboard data adapter) → dashboard. Failures are shown, never replaced
 * with fixture results.
 */
export function useImportFlow() {
  const router = useRouter();
  const data = useDashboardData();
  const [phase, setPhase] = useState<ImportPhase>({ kind: "idle" });
  const last = useRef<ImportPayload | null>(null);
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(
    async (payload: ImportPayload) => {
      last.current = payload;
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      setPhase({ kind: "analysing", messageCount: payload.messages.length });

      let found: Commitment[];
      let mode: ExtractionMode;
      try {
        ({ commitments: found, mode } = await extractCommitments(payload, ac.signal));
      } catch (cause) {
        if (ac.signal.aborted) return;
        setPhase({
          kind: "error",
          message:
            cause instanceof ApiError
              ? cause.message
              : "Something went wrong while analysing this conversation.",
        });
        return;
      }
      if (ac.signal.aborted) return;

      if (found.length === 0) {
        setPhase({ kind: "empty" });
        return;
      }

      data.addCommitments(found, payload.messages);
      const youOwe = found.filter((c) => c.direction === "you_owe").length;
      const theyOwe = found.filter((c) => c.direction === "they_owe").length;
      toast.success(`Found ${found.length} commitment${found.length === 1 ? "" : "s"}`, {
        description: `${youOwe} you owe · ${theyOwe} owed to you${mode === "demo" ? " · demo extraction" : ""}`,
      });
      router.push(ROUTES.dashboard);
    },
    [data, router],
  );

  const retry = useCallback(() => {
    if (last.current) void run(last.current);
  }, [run]);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setPhase({ kind: "idle" });
  }, []);

  const reset = useCallback(() => setPhase({ kind: "idle" }), []);

  return { phase, onImport: run, retry, cancel, reset };
}

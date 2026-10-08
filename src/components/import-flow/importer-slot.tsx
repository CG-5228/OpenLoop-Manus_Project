"use client";

/**
 * ImporterSlot — the single mount point for Member 2's conversation importer.
 *
 * INTEGRATION (when `feature/conversation` / PR #1 is on main), replace the
 * placeholder below with:
 *
 *   import { ConversationImporter } from "@/components/import";
 *   return <ConversationImporter onImport={onImport} />;
 *
 * `onImport` receives Member 2's `ConversationImportPayload`
 * ({ messages, currentUserLabel, referenceDate? }) and is handled by
 * `useImportFlow` (extraction → storage → dashboard).
 */
import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, MessageSquareText } from "lucide-react";
import type { ImportPayload } from "@/components/import-flow/use-import-flow";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/ui/routes";

export function ImporterSlot({ onImport }: { onImport: (payload: ImportPayload) => Promise<void> }) {
  void onImport; // wired once the importer is mounted (see header comment)

  return (
    <div className="rounded-[18px] border border-dashed border-line-strong bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap gap-2" aria-hidden>
        {[
          { Icon: MessageSquareText, label: "Paste a chat" },
          { Icon: FileText, label: ".txt export" },
          { Icon: ImageIcon, label: "Screenshot" },
        ].map(({ Icon, label }) => (
          <span
            key={label}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 text-[13px] text-ink-2"
          >
            <Icon className="size-3.5" /> {label}
          </span>
        ))}
      </div>
      <h2 className="mt-6 text-[17px] font-semibold tracking-tight text-ink">
        Conversation import is almost here
      </h2>
      <p className="mt-1.5 max-w-[520px] text-[14px] leading-relaxed text-ink-2">
        You&apos;ll be able to paste a conversation or load the fictional sample, choose which sender is
        you, and send it for analysis. Until then, explore how results look on the demo dashboard.
      </p>
      <Button asChild variant="primary" className="mt-6">
        <Link href={ROUTES.dashboard}>
          Explore the demo dashboard <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

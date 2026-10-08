"use client";

/**
 * ImporterSlot — the single mount point for Member 2's conversation importer.
 *
 * `onImport` receives Member 2's `ConversationImportPayload`
 * ({ messages, currentUserLabel, referenceDate? }), which is structurally
 * identical to `ImportPayload`, and is handled by `useImportFlow`
 * (real AI extraction → storage → dashboard).
 */
import { ConversationImporter } from "@/components/import";
import type { ImportPayload } from "@/components/import-flow/use-import-flow";

export function ImporterSlot({ onImport }: { onImport: (payload: ImportPayload) => Promise<void> }) {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-6 sm:p-8">
      <ConversationImporter onImport={onImport} />
    </div>
  );
}

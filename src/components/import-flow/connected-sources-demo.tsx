"use client";
/**
 * PRESENTATION PREVIEW — simulated "connected sources".
 *
 * Shows how automatic import from WhatsApp, Gmail and Google Calendar would
 * work. Nothing here talks to WhatsApp or Google. The "sync" saves clearly
 * fictional sample conversations with pre-extracted commitments (no AI call),
 * so the dashboard can be demoed without a production AI key. Every card is
 * labelled "Preview".
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, LoaderCircle, Mail, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Commitment, Message } from "@/types/openloop";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { cn } from "@/lib/utils";

type SourceId = "whatsapp" | "gmail" | "calendar";
type Phase = "idle" | "authorising" | "syncing" | "connected";

const endOfDay = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};
const at = (daysFromNow: number, hours: number, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

interface Item {
  message: Omit<Message, "source" | "conversationId">;
  commitment?: Omit<Commitment, "sourceMessageId" | "evidenceQuote" | "status">;
}

function buildDataset(source: "whatsapp" | "gmail"): { commitments: Commitment[]; messages: Message[] } {
  const conversationId = `preview-${source}`;
  const items: Item[] =
    source === "whatsapp"
      ? [
          {
            message: { id: "preview-wa-1", sender: "Priya", text: "I'll send you the venue deposit invoice by Friday.", sentAt: at(-1, 18, 4) },
            commitment: { id: "preview-wa-c1", title: "Send the venue deposit invoice", promisor: "Priya", beneficiary: "Me", direction: "they_owe", dueAt: endOfDay(2), confidence: "high" },
          },
          {
            message: { id: "preview-wa-2", sender: "Me", text: "Sure, I'll book the table for Saturday tonight.", sentAt: at(-1, 18, 6) },
            commitment: { id: "preview-wa-c2", title: "Book the table for Saturday", promisor: "Me", beneficiary: "Priya", direction: "you_owe", dueAt: endOfDay(0), confidence: "high" },
          },
          {
            message: { id: "preview-wa-3", sender: "Tom", text: "I'll pay you back the €35 for the tickets tomorrow.", sentAt: at(-2, 21, 30) },
            commitment: { id: "preview-wa-c3", title: "Pay back €35 for the tickets", promisor: "Tom", beneficiary: "Me", direction: "they_owe", dueAt: endOfDay(-1), confidence: "high" },
          },
        ]
      : [
          {
            message: { id: "preview-gm-1", sender: "Dr. Lena Park", text: "Subject: Thesis draft\n\nI'll send you my comments on chapter 2 by Monday.", sentAt: at(-1, 9, 15) },
            commitment: { id: "preview-gm-c1", title: "Send comments on chapter 2", promisor: "Dr. Lena Park", beneficiary: "Me", direction: "they_owe", dueAt: endOfDay(4), confidence: "high" },
          },
          {
            message: { id: "preview-gm-2", sender: "Me", text: "Thanks! I'll submit the revised abstract before Wednesday.", sentAt: at(-1, 10, 2) },
            commitment: { id: "preview-gm-c2", title: "Submit the revised abstract", promisor: "Me", beneficiary: "Dr. Lena Park", direction: "you_owe", dueAt: endOfDay(5), confidence: "high" },
          },
        ];
  const quote = (text: string) => text.split("\n").pop() ?? text;
  const messages: Message[] = items.map(({ message }) => ({ ...message, conversationId, source: "paste" }));
  const commitments: Commitment[] = items
    .filter((i) => i.commitment)
    .map(({ message, commitment }) => ({
      ...commitment!,
      sourceMessageId: message.id,
      evidenceQuote: quote(message.text),
      status: "pending",
    }));
  return { commitments, messages };
}

const SOURCES: Record<SourceId, { name: string; icon: typeof Mail; tint: string; blurb: string; auth: string; sync: string; done: string }> = {
  whatsapp: {
    name: "WhatsApp",
    icon: MessageCircle,
    tint: "bg-[#25D366]/15 text-[#128C7E]",
    blurb: "Link once with a QR code. New chats are scanned for promises automatically.",
    auth: "Scan this code with WhatsApp → Linked devices",
    sync: "Scanning 3 recent chats…",
    done: "3 chats synced",
  },
  gmail: {
    name: "Gmail",
    icon: Mail,
    tint: "bg-[#EA4335]/12 text-[#C5221F]",
    blurb: "Read-only access. Email threads with promises become tracked commitments.",
    auth: "Signing in with Google (read-only)…",
    sync: "Scanning 24 recent threads…",
    done: "24 threads scanned",
  },
  calendar: {
    name: "Google Calendar",
    icon: CalendarDays,
    tint: "bg-[#4285F4]/12 text-[#1A73E8]",
    blurb: "Deadlines you owe are added to your calendar with a reminder.",
    auth: "Signing in with Google…",
    sync: "Adding deadlines to your calendar…",
    done: "Deadlines will sync",
  },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function FakeQr() {
  // Decorative only: a deterministic pattern, not a real pairing code.
  const cells = Array.from({ length: 121 }, (_, i) => ((i * 7919) % 11) % 3 === 0 || i % 13 === 0);
  return (
    <div className="grid size-28 grid-cols-11 gap-[2px] rounded-lg border border-line bg-white p-2" aria-hidden>
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-ink" : "bg-transparent"} />
      ))}
    </div>
  );
}

export function ConnectedSourcesDemo() {
  const data = useDashboardData();
  const router = useRouter();
  const [phase, setPhase] = useState<Record<SourceId, Phase>>({ whatsapp: "idle", gmail: "idle", calendar: "idle" });
  const set = (id: SourceId, p: Phase) => setPhase((s) => ({ ...s, [id]: p }));

  async function connect(id: SourceId) {
    set(id, "authorising");
    await wait(id === "whatsapp" ? 2200 : 1400);
    set(id, "syncing");
    await wait(1600);
    if (id === "calendar") {
      const owed = data.commitments.filter((c) => c.direction === "you_owe" && c.status === "pending" && c.dueAt).length;
      set(id, "connected");
      toast.success("Google Calendar connected (preview)", {
        description: owed ? `${owed} deadline${owed === 1 ? "" : "s"} you owe would be added with reminders.` : "Future deadlines you owe would be added with reminders.",
      });
      return;
    }
    const { commitments, messages } = buildDataset(id);
    try {
      data.addCommitments(commitments, messages);
    } catch {
      set(id, "idle");
      return;
    }
    set(id, "connected");
    toast.success(`${SOURCES[id].name} connected (preview)`, {
      description: `Found ${commitments.length} commitments in sample ${id === "whatsapp" ? "chats" : "emails"}.`,
      action: { label: "View", onClick: () => router.push("/dashboard") },
    });
  }

  return (
    <section aria-labelledby="connected-sources" className="mb-6 rounded-[18px] border border-line bg-surface p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="connected-sources" className="text-[17px] font-semibold tracking-tight text-ink">
          Connect your apps
        </h2>
        <span className="rounded-full border border-line bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-ink-3">
          Preview · simulated with fictional data
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-3">Skip manual exports: connect once and OpenLoop imports new conversations automatically.</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {(Object.keys(SOURCES) as SourceId[]).map((id) => {
          const s = SOURCES[id];
          const p = phase[id];
          const Icon = s.icon;
          return (
            <li key={id} className="flex flex-col rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex items-center gap-2.5">
                <span className={cn("inline-flex size-9 items-center justify-center rounded-xl", s.tint)}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="font-medium text-ink">{s.name}</span>
                {p === "connected" && <Check className="ml-auto size-4 text-emerald-600" aria-label="Connected" />}
              </div>
              <p className="mt-2.5 flex-1 text-[13px] leading-snug text-ink-3">{s.blurb}</p>
              {p === "authorising" && id === "whatsapp" && (
                <div className="mt-3 flex flex-col items-center gap-2 text-center">
                  <FakeQr />
                  <span className="flex items-center gap-1 text-[12px] text-ink-3"><QrCode className="size-3.5" aria-hidden />{s.auth}</span>
                </div>
              )}
              <div className="mt-3" aria-live="polite">
                {p === "idle" && (
                  <button type="button" onClick={() => void connect(id)} className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white transition hover:opacity-90">
                    Connect {s.name}
                  </button>
                )}
                {(p === "authorising" && id !== "whatsapp") || p === "syncing" ? (
                  <p className="flex items-center gap-2 text-[13px] text-ink-2">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    {p === "syncing" ? s.sync : s.auth}
                  </p>
                ) : null}
                {p === "connected" && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] text-emerald-700"><ShieldCheck className="size-4" aria-hidden />{s.done}</span>
                    {id !== "calendar" && (
                      <button type="button" onClick={() => router.push("/dashboard")} className="text-[13px] font-medium text-ink underline-offset-2 hover:underline">
                        View →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

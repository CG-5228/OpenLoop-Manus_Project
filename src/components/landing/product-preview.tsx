import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/primitives";

/**
 * Static, illustrative product preview for the landing page (synthetic
 * example conversation — mirrors test scenarios 1, 2, 4 and 5 in the brief).
 */
const MESSAGES = [
  { sender: "James", before: "", mark: "I'll email you the report by Friday.", after: "", side: "left" },
  { sender: "You", before: "Perfect, thanks. ", mark: "I'll send Sarah the slides tonight.", after: "", side: "right" },
  { sender: "Sarah", before: "I might send you something next week.", mark: "", after: "", side: "left", ignored: true },
  { sender: "Alex", before: "", mark: "I'll send you the API key.", after: "", side: "left" },
] as const;

const FOUND = [
  { dir: "they", person: "James", title: "Email the project report", due: "Fri", tone: "text-ink-2" },
  { dir: "you", person: "Sarah", title: "Send Sarah the slides", due: "Tonight", tone: "text-review-fg" },
  { dir: "they", person: "Alex", title: "Send the API key", due: "No deadline", tone: "text-ink-3" },
] as const;

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[1040px] text-left">
      <div
        aria-hidden
        className="absolute -inset-x-6 -bottom-8 top-10 -z-10 rounded-[32px] bg-[radial-gradient(60%_60%_at_50%_40%,rgb(227_245_106/0.35),transparent_70%)] blur-2xl"
      />
      <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-pop">
        {/* Window chrome */}
        <div className="flex h-11 items-center justify-between border-b border-line bg-canvas/60 px-4">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <span className="font-mono text-[11px] text-ink-3">openloop · analysing conversation</span>
          <span className="w-10" />
        </div>

        <div className="grid md:grid-cols-[1.05fr_auto_1fr]">
          {/* Conversation */}
          <div className="p-5 sm:p-7">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3">
              Group chat · Project Atlas
            </p>
            <ul className="space-y-3.5">
              {MESSAGES.map((m, i) => (
                <li key={i} className={cn("flex gap-2.5", m.side === "right" && "flex-row-reverse")}>
                  <Avatar name={m.sender} />
                  <div className={cn("max-w-[85%]", m.side === "right" && "text-right")}>
                    <p className="mb-1 text-[11px] font-medium text-ink-3">{m.sender}</p>
                    <p
                      className={cn(
                        "inline-block rounded-2xl px-3.5 py-2 text-left text-[14px] leading-relaxed",
                        m.side === "right"
                          ? "rounded-tr-md bg-ink text-ink-inverse"
                          : "rounded-tl-md border border-line bg-subtle/70 text-ink",
                        "ignored" in m && m.ignored && "text-ink-3",
                      )}
                    >
                      {m.before}
                      {m.mark && (
                        <mark className={cn("highlight-mark", m.side === "right" ? "text-ink" : "text-ink")}>
                          {m.mark}
                        </mark>
                      )}
                      {m.after}
                    </p>
                    {"ignored" in m && m.ignored && (
                      <p className="mt-1 text-[11px] text-ink-3">Tentative — not tracked as a promise</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="relative hidden items-center md:flex" aria-hidden>
            <div className="h-full w-px bg-line" />
            <span className="absolute left-1/2 top-1/2 inline-flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface shadow-card">
              <ArrowRight className="size-4 text-ink-2" />
            </span>
          </div>

          {/* Extracted commitments */}
          <div className="border-t border-line bg-canvas/50 p-5 sm:p-7 md:border-t-0">
            <p className="mb-4 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3">
              <Sparkles className="size-3.5 text-ink-2" aria-hidden /> 3 commitments found
            </p>
            <ul className="space-y-2.5">
              {FOUND.map((f) => (
                <li
                  key={f.title}
                  className="rounded-xl border border-line bg-surface p-3.5 shadow-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3">
                      {f.dir === "you" ? (
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowDownLeft className="size-3.5" aria-hidden />
                      )}
                      {f.dir === "you" ? "You owe" : "Owed to you"}
                    </span>
                    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-pending-bg px-2 text-[11px] font-medium text-pending-fg">
                      <span className="size-1.5 rounded-full bg-pending" /> Pending
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] font-medium text-ink">{f.title}</p>
                  <div className="mt-2 flex items-center gap-3 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 text-ink-2">
                      <Avatar name={f.person} size="sm" />
                      {f.dir === "you" ? `To ${f.person}` : `From ${f.person}`}
                    </span>
                    <span className={cn("inline-flex items-center gap-1", f.tone)}>
                      <CalendarClock className="size-3.5" aria-hidden /> {f.due}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

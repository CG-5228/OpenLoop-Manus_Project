import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  MessageSquareText,
  Quote,
  ShieldCheck,
  Sparkles,
  Upload,
  CircleCheck,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/landing/product-preview";
import { ROUTES } from "@/lib/ui/routes";

const STEPS = [
  {
    n: "01",
    title: "Import a conversation",
    body: "Paste a chat, drop in a screenshot or upload a .txt export from WhatsApp, Discord, Telegram or email. Tell OpenLoop which sender is you.",
    Icon: Upload,
  },
  {
    n: "02",
    title: "AI finds the promises",
    body: "OpenLoop separates real commitments from maybes and small talk, then works out who owes what, to whom, and by when.",
    Icon: Sparkles,
  },
  {
    n: "03",
    title: "Close the loop",
    body: "Track deadlines, nudge with a follow-up you've approved, and confirm when a later message shows a promise was kept.",
    Icon: CircleCheck,
  },
];

const FEATURES = [
  {
    title: "Emails that become actions",
    body: "Planned email connections will surface deadlines and commitments from the accounts you authorise — not just the messages you remember to copy.",
    Icon: ArrowDownLeft,
  },
  {
    title: "University updates in one place",
    body: "Planned website monitoring will help catch assignment dates, timetable changes and university events from the pages you choose.",
    Icon: Quote,
  },
  {
    title: "Tickets with a place in your day",
    body: "Planned ticket reading will pick out event and booking details, ready to become useful calendar entries.",
    Icon: Sparkles,
  },
  {
    title: "A calendar backed by the source",
    body: "Planned calendar entries will link back to the original email, university page or ticket, so you can check the details instead of trusting a guess.",
    Icon: MessageSquareText,
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-transparent bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-5 sm:px-8">
          <Link href={ROUTES.home} aria-label="OpenLoop home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:inline-block">
              How it works
            </a>
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:inline-block">
              Features
            </a>
            <Button asChild variant="primary" size="md" className="ml-1">
              <Link href={ROUTES.dashboard}>
                Open app <ArrowRight />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1160px] px-5 pb-16 pt-14 text-center sm:px-8 sm:pb-24 sm:pt-20">
        <p className="mx-auto inline-flex animate-rise items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium text-ink-2 shadow-card">
          <span className="size-1.5 rounded-full bg-[#b9cf1f]" aria-hidden />
          AI commitment tracking for everyday conversations
        </p>
        <h1 className="mx-auto mt-6 max-w-[900px] animate-rise font-display text-[46px] leading-[1.02] tracking-[-0.02em] text-ink [animation-delay:60ms] sm:text-[72px] lg:text-[84px]">
          Never forget what you owe — or what you&apos;re{" "}
          <em className="relative whitespace-nowrap italic">
            <span className="relative z-10">owed.</span>
            <span aria-hidden className="absolute inset-x-[-0.06em] bottom-[0.08em] -z-0 h-[0.32em] rounded-sm bg-highlight" />
          </em>
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] animate-rise text-[17px] leading-relaxed text-ink-2 [animation-delay:120ms] sm:text-[19px]">
          OpenLoop reads the conversations you import, finds the promises buried inside them, and keeps a
          two-way ledger of who owes what to whom — with the original message as proof.
        </p>
        <div className="mt-9 flex animate-rise flex-col items-center justify-center gap-3 [animation-delay:180ms] sm:flex-row">
          <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
            <Link href={`${ROUTES.import}?sample=1`}>
              Try sample conversation <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
            <Link href={ROUTES.dashboard}>See the dashboard</Link>
          </Button>
        </div>
        <p className="mt-4 animate-rise text-[13px] text-ink-3 [animation-delay:220ms]">
          No sign-up · Fictional sample included · Nothing is ever sent for you
        </p>

        <div className="mt-14 animate-rise [animation-delay:260ms] sm:mt-20">
          <ProductPreview />
        </div>
      </section>

      {/* Concept */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1160px] px-5 py-16 sm:px-8 sm:py-24">
          <p className="max-w-[920px] font-display text-[32px] leading-[1.15] tracking-[-0.01em] sm:text-[48px]">
            <span className="text-ink-3">Todo apps remember the tasks you enter.</span>{" "}
            <span className="text-ink">OpenLoop remembers the promises you never entered.</span>
          </p>
          <div className="mt-10 grid gap-6 border-t border-line pt-8 text-sm text-ink-2 sm:grid-cols-3">
            {[
              ["“I'll send you the report tomorrow.”", "Becomes a tracked promise owed to you, due tomorrow."],
              ["“Can you transfer me €20 tonight?” — “Sure.”", "Becomes something you owe, with the message as proof."],
              ["“I might send you something next week.”", "Stays out of your list. Maybes aren't promises."],
            ].map(([q, a]) => (
              <div key={q}>
                <p className="font-medium text-ink">{q}</p>
                <p className="mt-1.5 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1160px] scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-[640px]">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">How it works</p>
          <h2 className="mt-3 font-display text-[38px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[52px]">
            From buried promise to closed loop in three steps.
          </h2>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ n, title, body, Icon }) => (
            <li key={n} className="relative rounded-[18px] border border-line bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-subtle text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-xs text-ink-3">{n}</span>
              </div>
              <h3 className="mt-8 text-[18px] font-semibold tracking-tight text-ink">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">What we&apos;re building next</p>
              <h2 className="mt-3 font-display text-[38px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[52px]">
                Your sources. Your schedule. Less manual work.
              </h2>
              <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-ink-2">
                We&apos;re moving beyond manual imports toward sources you authorise and a calendar that
                stays useful. The aim is less copying and pasting, with source evidence and review for uncertain details.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-[13px] text-ink-2">
                <ShieldCheck className="size-4 text-done" aria-hidden />
                Planned, not yet connected: today&apos;s demo analyses conversations you paste.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2">
              {FEATURES.map(({ title, body, Icon }) => (
                <div key={title} className="bg-surface p-6">
                  <Icon className="size-5 text-ink" aria-hidden />
                  <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1160px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-[26px] bg-ink px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="absolute -right-24 -top-24 size-72 rounded-full border-[28px] border-white/5"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-20 size-80 rounded-full border-[28px] border-white/[0.04]"
          />
          <LogoMark className="relative mx-auto size-12" />
          <h2 className="relative mx-auto mt-6 max-w-[640px] font-display text-[40px] leading-[1.05] tracking-[-0.015em] text-ink-inverse sm:text-[56px]">
            Close your open loops.
          </h2>
          <p className="relative mx-auto mt-4 max-w-[460px] text-[16px] leading-relaxed text-ink-inverse/65">
            Import one conversation and see every promise inside it in under a minute.
          </p>
          <Button asChild variant="highlight" size="lg" className="relative mt-8">
            <Link href={ROUTES.import}>
              Get started <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-4 px-5 py-8 text-[13px] text-ink-3 sm:flex-row sm:px-8">
          <Logo className="opacity-80" />
          <p className="text-center">This demo uses rule-based extraction in place of AI and saves data in your browser. OpenLoop never sends messages automatically.</p>
          <p>© 2026 OpenLoop</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { addDays, format, nextFriday, nextMonday, setHours, setMinutes } from "date-fns";
import type { Commitment } from "@/types/openloop";
import { useCommitmentActions } from "@/components/commitment/use-commitment-actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFullDate, isDateOnly, parseDue } from "@/lib/ui/commitment-view";
import { cn } from "@/lib/utils";

function toParts(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = parseDue(iso);
  return { date: format(d, "yyyy-MM-dd"), time: isDateOnly(iso) ? "" : format(d, "HH:mm") };
}

function at(d: Date, h: number, m = 0) {
  return setMinutes(setHours(d, h), m);
}

export function DeadlineDialog({
  commitment,
  open,
  onOpenChange,
}: {
  commitment: Commitment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Change deadline"
        description={
          commitment.dueAt
            ? `Currently due ${formatFullDate(commitment.dueAt)}.`
            : "This commitment has no deadline in the conversation."
        }
      >
        {open && (
          <DeadlineForm commitment={commitment} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeadlineForm({
  commitment,
  onDone,
}: {
  commitment: Commitment;
  onDone: () => void;
}) {
  const actions = useCommitmentActions();
  const initial = toParts(commitment.dueAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time || "17:00");

  const now = new Date();
  const presets = [
    { label: "Tonight", value: at(now, 21) },
    { label: "Tomorrow", value: at(addDays(now, 1), 17) },
    { label: "Friday", value: at(nextFriday(now), 17) },
    { label: "Next week", value: at(nextMonday(now), 9) },
  ].filter((p) => p.value.getTime() > now.getTime());

  const valid = Boolean(date);

  function save() {
    if (!valid) return;
    const d = new Date(`${date}T${time || "17:00"}`);
    if (Number.isNaN(d.getTime())) return;
    actions.updateDeadline(commitment, d.toISOString());
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const parts = toParts(p.value.toISOString());
          const active = parts.date === date && parts.time === time;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setDate(parts.date);
                setTime(parts.time);
              }}
              className={cn(
                "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Date</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 font-mono text-sm text-ink outline-none focus:border-ink-3"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-10 w-[120px] rounded-[10px] border border-line bg-surface px-3 font-mono text-sm text-ink outline-none focus:border-ink-3"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        {commitment.dueAt ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-overdue-fg hover:bg-overdue-bg hover:text-overdue-fg"
            onClick={() => {
              actions.updateDeadline(commitment, null);
              onDone();
            }}
          >
            Remove deadline
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={!valid}>
            Save deadline
          </Button>
        </div>
      </div>
    </form>
  );
}

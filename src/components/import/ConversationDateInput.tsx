"use client";

import { useId } from "react";

export interface ConversationDateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ConversationDateInput({ value, onChange, disabled }: ConversationDateInputProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">Conversation date (optional)</label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-describedby={`${id}-help`}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
      />
      <p id={`${id}-help`} className="text-xs text-slate-500">
        Only enter a date you know. It gives the analysis context for words such as “tomorrow”; it does not create a deadline or a message timestamp.
      </p>
    </div>
  );
}

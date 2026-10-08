"use client";

import { useId } from "react";
import { MAX_CONVERSATION_CHARACTERS } from "../../lib/conversation";

export interface ConversationTextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ConversationTextInput({ value, onChange, disabled }: ConversationTextInputProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">Review conversation text</label>
      <p id={`${id}-help`} className="text-sm text-slate-600">
        Use one sender per message, for example: James: I will send the report tomorrow.
        You can correct text here before analysis.
      </p>
      <textarea
        id={id}
        aria-describedby={`${id}-help`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={MAX_CONVERSATION_CHARACTERS}
        rows={8}
        placeholder="Me: I'll send Sarah the slides tonight."
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
      />
      <p className="text-xs text-slate-500">{value.length.toLocaleString()} / {MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters</p>
    </div>
  );
}

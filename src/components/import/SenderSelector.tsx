"use client";

import { useId } from "react";

export interface SenderSelectorProps {
  senders: string[];
  value: string;
  onChange: (sender: string) => void;
  disabled?: boolean;
}

export function SenderSelector({ senders, value, onChange, disabled }: SenderSelectorProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">Which sender is you?</label>
      <input
        id={id}
        list={`${id}-senders`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="Select or enter your exact sender name"
        aria-describedby={`${id}-help`}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
      />
      <datalist id={`${id}-senders`}>
        {senders.map((sender) => <option key={sender} value={sender} />)}
      </datalist>
      <p id={`${id}-help`} className="text-xs text-slate-500">
        Use a sender name visible in the preview. Identity is not inferred automatically.
      </p>
    </div>
  );
}

"use client";

import type { Message } from "../../types/openloop";

export interface MessagePreviewProps {
  messages: Message[];
}

export function MessagePreview({ messages }: MessagePreviewProps) {
  if (messages.length === 0) {
    return <p className="text-sm text-slate-500">Your structured message preview will appear here.</p>;
  }
  return (
    <section aria-label="Structured message preview" className="space-y-3">
      <h3 className="font-medium">Message preview · {messages.length}</h3>
      <ol className="max-h-80 space-y-2 overflow-y-auto">
        {messages.slice(0, 100).map((message) => (
          <li key={message.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <strong className="text-sm text-slate-900">{message.sender}</strong>
              <span>Source: {message.source}</span>
              {message.sentAt ? <time dateTime={message.sentAt}>{message.sentAt}</time> : <span>Timestamp unknown</span>}
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.text}</p>
          </li>
        ))}
      </ol>
      {messages.length > 100 && (
        <p className="text-xs text-slate-500">Showing the first 100 messages; all {messages.length} will be passed to the application.</p>
      )}
    </section>
  );
}

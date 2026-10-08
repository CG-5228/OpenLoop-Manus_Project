"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[rgb(26_25_21/0.32)] backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-pop focus:outline-none data-[state=open]:animate-pop-in sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[12vh] sm:w-full sm:max-w-[480px] sm:-translate-x-1/2 sm:p-6",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <D.Title className="text-[17px] font-semibold tracking-tight text-ink">
              {title}
            </D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm leading-relaxed text-ink-2">
                {description}
              </D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="-mr-1.5 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/** Left-edge sheet used for mobile navigation. */
export function SheetContent({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[rgb(26_25_21/0.32)] data-[state=open]:animate-fade-in" />
      <D.Content className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-line bg-canvas shadow-pop focus:outline-none data-[state=open]:animate-fade-in">
        <D.Title className="sr-only">{title}</D.Title>
        <D.Description className="sr-only">{title}</D.Description>
        {children}
      </D.Content>
    </D.Portal>
  );
}

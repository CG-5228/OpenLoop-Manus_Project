"use client";

import { DropdownMenu as DM } from "radix-ui";
import { cn } from "@/lib/utils";

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-[200px] rounded-xl border border-line bg-surface p-1 shadow-pop data-[state=open]:animate-pop-in",
          className,
        )}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  destructive,
  icon,
  shortcut,
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: (e: Event) => void;
  destructive?: boolean;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <DM.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        "flex h-9 cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink outline-none transition-colors data-[disabled]:opacity-40 data-[highlighted]:bg-subtle [&_svg]:size-4 [&_svg]:text-ink-3",
        destructive && "text-overdue-fg data-[highlighted]:bg-overdue-bg [&_svg]:text-overdue-fg",
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="font-mono text-[11px] text-ink-3">{shortcut}</span>}
    </DM.Item>
  );
}

export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-line" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DM.Label className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
      {children}
    </DM.Label>
  );
}

export const MenuRadioGroup = DM.RadioGroup;

export function MenuRadioItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <DM.RadioItem
      value={value}
      className="relative flex h-9 cursor-default select-none items-center rounded-lg pl-8 pr-2.5 text-sm text-ink outline-none data-[highlighted]:bg-subtle"
    >
      <DM.ItemIndicator className="absolute left-2.5 inline-flex">
        <span className="size-1.5 rounded-full bg-ink" />
      </DM.ItemIndicator>
      {children}
    </DM.RadioItem>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { ArrowUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SORT_OPTIONS,
  STATUS_FILTERS,
  type SortKey,
  type StatusFilter,
} from "@/lib/ui/commitment-view";
import { Kbd } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";

export function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label
      className={cn(
        "group relative flex h-9 items-center rounded-[10px] border border-line bg-surface shadow-card transition-colors focus-within:border-ink-3",
        className,
      )}
    >
      <span className="sr-only">Search commitments</span>
      <Search className="pointer-events-none ml-3 size-4 shrink-0 text-ink-3" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            ref.current?.blur();
          }
        }}
        placeholder="Search people, promises, quotes…"
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mr-1.5 inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <Kbd className="mr-2 hidden sm:inline-flex">/</Kbd>
      )}
    </label>
  );
}

export function StatusChips({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter by status"
      className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {STATUS_FILTERS.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
              active
                ? "border-ink bg-ink text-ink-inverse"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            {label}
            <span
              className={cn(
                "tabular-nums text-[12px]",
                active ? "text-ink-inverse/60" : "text-ink-3",
              )}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const current = SORT_OPTIONS.find((o) => o.key === value)?.label ?? "Deadline";
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="secondary" size="md" aria-label={`Sort by ${current}`}>
          <ArrowUpDown className="text-ink-3" />
          <span className="hidden sm:inline">
            <span className="text-ink-3">Sort:</span> {current}
          </span>
        </Button>
      </MenuTrigger>
      <MenuContent className="min-w-[180px]">
        <MenuLabel>Sort by</MenuLabel>
        <MenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortKey)}>
          {SORT_OPTIONS.map((o) => (
            <MenuRadioItem key={o.key} value={o.key}>
              {o.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

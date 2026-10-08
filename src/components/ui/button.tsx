import { forwardRef } from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "highlight";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-ink-inverse hover:bg-[#2c2a24] active:bg-black shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
  secondary:
    "bg-surface text-ink border border-line shadow-card hover:border-line-strong hover:bg-[#fcfbf9]",
  outline: "border border-line text-ink hover:bg-subtle",
  ghost: "text-ink-2 hover:text-ink hover:bg-subtle",
  danger: "bg-surface text-overdue-fg border border-line hover:bg-overdue-bg hover:border-[#f3c9ca]",
  highlight: "bg-highlight text-ink hover:brightness-[0.97] shadow-[inset_0_-1px_0_rgb(0_0_0/0.08)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[9px]",
  md: "h-9 px-3.5 text-sm gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
  icon: "size-9 rounded-[10px]",
  "icon-sm": "size-8 rounded-[9px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", asChild, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion/tokens";

type Variant = "primary" | "believe" | "doubt" | "ghost" | "paper";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-gold text-ink hover:bg-gold/90 shadow-e1",
  believe: "bg-believe text-ink hover:bg-believe/90 shadow-e1",
  doubt: "bg-doubt text-paper hover:bg-doubt/90 shadow-e1",
  ghost: "bg-transparent text-paper hover:bg-ink-raised border border-ink-line",
  paper: "bg-paper text-ink hover:bg-paper-dim shadow-e1",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * GRUDGE button: 0.97 press scale + snappy spring release (micro-interaction
 * spec #9). Ships default/hover/focus-visible/active/disabled/loading states.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={SPRING.snappy}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-control font-mono font-semibold uppercase tracking-wide",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
});

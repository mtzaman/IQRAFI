import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Card({ className, as: Tag = "section", ...props }: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "li" }) {
  return <Tag className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-accent-text", className)} {...props} />;
}

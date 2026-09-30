/* eslint-disable @next/next/no-img-element */
import { cn } from "./cn";

export function initials(name: string | null | undefined) {
  if (!name) return "·";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => [...p][0] ?? "")
    .join("")
    .toUpperCase();
}

export function Avatar({ name, src, size = 36, className }: { name: string | null | undefined; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (src) return <img src={src} alt="" width={size} height={size} className={cn("rounded-full object-cover", className)} style={style} referrerPolicy="no-referrer" />;
  return (
    <span aria-hidden className={cn("inline-flex items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-soft-text", className)} style={style}>
      {initials(name)}
    </span>
  );
}

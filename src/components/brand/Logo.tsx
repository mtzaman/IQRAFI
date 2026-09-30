import { cn } from "../ui/cn";

/**
 * IQRAFI mark: two open pages forming a path that rises into the letter "I",
 * enclosed by a ring of completion. Works as app icon, favicon and monochrome mark.
 */
export function LogoMark({ size = 32, className, mono = false }: { size?: number; className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden focusable="false">
      <circle cx="32" cy="32" r="28" fill="none" stroke={mono ? "currentColor" : "var(--accent)"} strokeWidth="3" strokeDasharray="160 16" strokeLinecap="round" transform="rotate(-100 32 32)" />
      <path d="M32 44c-4.5-3.2-10-4.4-16-4.4V22.4c6 0 11.5 1.2 16 4.4" fill="none" stroke={mono ? "currentColor" : "var(--primary)"} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M32 44c4.5-3.2 10-4.4 16-4.4V22.4c-6 0-11.5 1.2-16 4.4" fill="none" stroke={mono ? "currentColor" : "var(--primary)"} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M32 44V17" stroke={mono ? "currentColor" : "var(--primary)"} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="32" cy="12.5" r="2.4" fill={mono ? "currentColor" : "var(--accent)"} />
    </svg>
  );
}

export function Wordmark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="font-semibold tracking-[0.18em] text-text" style={{ fontSize: size * 0.62 }} dir="ltr">
        IQRAFI
      </span>
    </span>
  );
}

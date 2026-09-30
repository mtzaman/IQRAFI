import { cn } from "./cn";

/** Linear progress with an accessible label and a visible value (never colour alone). */
export function ProgressBar({ value, max = 100, label, className, showValue = false, valueText }: { value: number; max?: number; label: string; className?: string; showValue?: boolean; valueText?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      {showValue ? <p className="mt-1.5 text-sm text-muted">{valueText}</p> : null}
    </div>
  );
}

/**
 * The 30 Juz drawn as a ring of segments: the brand's "shared journey" motif.
 * Completed segments are filled; the centre states the count in text.
 */
export function JuzRing({ completed, size = 132, label, children }: { completed: number; size?: number; label: string; children?: React.ReactNode }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const gap = 2.2;
  const seg = c / 30 - gap;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label} className="-rotate-90">
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="7"
            strokeLinecap="butt"
            className={i < completed ? "stroke-primary" : "stroke-surface-2"}
            strokeDasharray={`${seg} ${c - seg}`}
            strokeDashoffset={-(i * (seg + gap))}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

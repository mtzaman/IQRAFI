import { formatNumber, type Dictionary, type Locale } from "@/i18n/config";
import type { GlobalStats } from "@/server/services/stats";

/** Calm, collective figures. No rankings, no comparisons — only what we have done together. */
export function GlobalStatsGrid({ stats, t, locale, variant = "light" }: { stats: GlobalStats; t: Dictionary; locale: Locale; variant?: "light" | "brand" }) {
  const items = [
    { label: t.discover.juzCompleted, value: stats.juzCompleted },
    { label: t.discover.quransCompleted, value: stats.quransCompleted },
    { label: t.discover.activeKhatmas, value: stats.activeKhatmas },
    { label: t.discover.readers, value: stats.readers },
    { label: t.discover.juzToday, value: stats.juzCompletedToday },
  ];
  const brand = variant === "brand";
  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, i) => (
          <div key={item.label} className={`rounded-2xl p-4 ${brand ? "bg-white/10" : "border border-line bg-surface"} ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
            <dt className={`text-sm ${brand ? "opacity-85" : "text-muted"}`}>{item.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{formatNumber(locale, item.value)}</dd>
          </div>
        ))}
      </dl>
      {stats.includesDemoData ? <p className={`mt-3 text-xs ${brand ? "opacity-80" : "text-muted"}`}>{t.discover.demoNotice}</p> : null}
    </div>
  );
}

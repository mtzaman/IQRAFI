import { getI18n } from "@/i18n/server";

/** A subtle reading placeholder while the page is prepared. */
export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div role="status" className="mx-auto max-w-3xl space-y-5 px-6 pt-24" aria-live="polite">
      <span className="sr-only">{t.reader.placeholder}</span>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="skeleton ms-auto h-6 rounded-full" style={{ width: `${70 + ((i * 13) % 30)}%` }} />
      ))}
    </div>
  );
}

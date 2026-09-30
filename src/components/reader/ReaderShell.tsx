"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { toggleBookmarkAction, updateReaderPrefsAction } from "@/app/actions/profile";
import { CompleteButton } from "@/components/khatma/AssignmentActions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";

type ReaderTheme = "light" | "dark" | "sepia";

export interface ReaderShellProps {
  title: string;
  subtitle?: string;
  firstAyahId: number;
  lastAyahId: number;
  /** Progress is measured within this Juz range (for surah pages it is the surah range). */
  signedIn: boolean;
  initialAyahId: number | null;
  prefs: { readerTheme: ReaderTheme; readerFontScale: number; showTranslation: boolean };
  prev?: { href: string; label: string } | null;
  next?: { href: string; label: string } | null;
  assignment?: { id: string; juzNumber: number; completed: boolean; groupName: string } | null;
  storageKey: string;
  children: ReactNode;
}

const SYNC_DELAY_MS = 4000;
const onlineSubscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

function readLocal(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Interactive reading surface. The Qur'an text itself is server-rendered (children);
 * this shell adds position tracking, offline-tolerant progress sync, bookmarks and
 * reading preferences, and keeps the completion action deliberate.
 */
export function ReaderShell(props: ReaderShellProps) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const { firstAyahId, lastAyahId, signedIn, storageKey } = props;
  const [theme, setTheme] = useState<ReaderTheme>(props.prefs.readerTheme);
  const [scale, setScale] = useState(props.prefs.readerFontScale);
  const [translation, setTranslation] = useState(props.prefs.showTranslation);
  const [furthest, setFurthest] = useState<number>(props.initialAyahId ?? firstAyahId - 1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; ref: string } | null>(null);
  const online = useSyncExternalStore(onlineSubscribe, () => navigator.onLine, () => true);
  const pendingSync = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);

  const total = lastAyahId - firstAyahId + 1;
  const progress = Math.max(0, Math.min(100, Math.round(((furthest - firstAyahId + 1) / total) * 100)));

  const flush = useCallback(
    (beacon = false) => {
      const ayahId = pendingSync.current;
      if (!signedIn || ayahId == null) return;
      const body = JSON.stringify({ ayahId });
      if (beacon && navigator.sendBeacon) {
        if (navigator.sendBeacon("/api/reading-progress", new Blob([body], { type: "application/json" }))) pendingSync.current = null;
        return;
      }
      if (!navigator.onLine) return; // keep it queued; retried when the connection returns
      fetch("/api/reading-progress", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true })
        .then((r) => {
          if (r.ok && pendingSync.current === ayahId) pendingSync.current = null;
        })
        .catch(() => undefined);
    },
    [signedIn],
  );

  const record = useCallback(
    (ayahId: number) => {
      setFurthest((f) => Math.max(f, ayahId));
      try {
        localStorage.setItem(storageKey, String(ayahId));
      } catch {
        /* storage unavailable */
      }
      pendingSync.current = ayahId;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), SYNC_DELAY_MS);
    },
    [flush, storageKey],
  );

  // Resume position: explicit #ayah-N, then server position, then this device's saved position.
  useEffect(() => {
    const hash = /^#ayah-(\d+)$/.exec(window.location.hash);
    const target = hash ? Number(hash[1]) : (props.initialAyahId ?? readLocal(storageKey));
    if (target && target > firstAyahId && target <= lastAyahId) {
      document.getElementById(`ayah-${target}`)?.scrollIntoView({ block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the ayah the reader is on.
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = Number((e.target as HTMLElement).dataset.ayahId);
          if (e.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        if (visible.size) record(Math.max(...visible));
      },
      { rootMargin: "0px 0px -35% 0px", threshold: 0 },
    );
    root.querySelectorAll<HTMLElement>("[data-ayah-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [record]);

  useEffect(() => {
    const onHide = () => flush(true);
    const onOnline = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  // Ayah marker buttons (event delegation keeps the server-rendered text untouched).
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah-button]");
      if (!btn) return;
      const ayah = btn.closest<HTMLElement>("[data-ayah-id]");
      setSelected({ id: Number(btn.dataset.ayahButton), ref: ayah?.dataset.ref ?? "" });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  const persistPrefs = (patch: Parameters<typeof updateReaderPrefsAction>[0]) => {
    if (signedIn) void updateReaderPrefsAction(patch);
  };

  const toggleBookmark = async () => {
    if (!selected) return;
    if (!signedIn) {
      toast(t.reader.signInToSave, "info");
      return;
    }
    const res = await toggleBookmarkAction(selected.id);
    if (res.ok) {
      const btn = container.current?.querySelector<HTMLElement>(`[data-ayah-button="${selected.id}"]`);
      if (btn) btn.textContent = res.data.bookmarked ? "★" : (btn.dataset.num ?? btn.textContent);
      toast(res.data.bookmarked ? t.reader.bookmarked : t.reader.removeBookmark);
    } else toast(t.errors.codes.generic, "error");
    setSelected(null);
  };

  return (
    <div data-reader-theme={theme} data-translation={translation ? "on" : "off"} className="min-h-dvh bg-page text-page-text" style={{ ["--quran-size" as string]: `${(1.75 * scale) / 100}rem` }}>
      <header className="sticky top-0 z-30 border-b border-page-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link href="/quran" className="rounded-full p-2 text-xl text-page-muted hover:bg-black/5" aria-label={t.quran.title}>
            <Icon name="chevronLeft" className="rtl:rotate-180" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{props.title}</h1>
            {props.subtitle ? <p className="truncate text-xs text-page-muted">{props.subtitle}</p> : null}
          </div>
          <span className="text-sm font-medium tabular-nums text-page-muted" aria-live="polite">
            {fmt(t.reader.progress, { n: progress })}
          </span>
          <button type="button" className="rounded-full p-2 text-xl text-page-muted hover:bg-black/5" onClick={() => setSettingsOpen(true)} aria-label={t.reader.settings}>
            <Icon name="text" />
          </button>
        </div>
        <div className="h-0.5 bg-page-line" aria-hidden>
          <div className="h-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {!online ? (
        <p role="status" className="mx-auto mt-3 flex max-w-3xl items-center gap-2 px-4 text-sm text-page-muted">
          <Icon name="wifiOff" /> {t.errors.offline}
        </p>
      ) : null}

      <div ref={container} id="main" className="mx-auto max-w-3xl px-5 pb-40 pt-8 sm:px-8">
        {props.assignment ? <p className="mb-6 text-center text-sm text-page-muted">{fmt(t.reader.assignmentFor, { group: props.assignment.groupName })}</p> : null}
        {props.children}

        <div className="mt-12 space-y-6 border-t border-page-line pt-8 text-center">
          {props.assignment ? (
            props.assignment.completed ? (
              <p className="font-medium">{t.reader.alreadyCompleted}</p>
            ) : online ? (
              <CompleteButton assignmentId={props.assignment.id} juzNumber={props.assignment.juzNumber} variant="primary" size="lg" label={fmt(t.reader.markComplete, { n: props.assignment.juzNumber })} />
            ) : (
              <p className="text-sm text-page-muted">{t.reader.offlineComplete}</p>
            )
          ) : null}
          {!signedIn ? <p className="text-sm text-page-muted">{t.reader.signInToSave}</p> : null}
          <nav className="flex items-center justify-between gap-3">
            {props.prev ? (
              <Link href={props.prev.href} className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium hover:bg-black/5">
                <Icon name="chevronLeft" className="rtl:rotate-180" />
                {props.prev.label}
              </Link>
            ) : (
              <span />
            )}
            {props.next ? (
              <Link href={props.next.href} className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium hover:bg-black/5">
                {props.next.label}
                <Icon name="chevronRight" className="rtl:rotate-180" />
              </Link>
            ) : null}
          </nav>
        </div>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.reader.settings} closeLabel={t.common.close}>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">{t.prefs.fontScale}</p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                aria-label={t.reader.fontSmaller}
                onClick={() => {
                  const v = Math.max(70, scale - 10);
                  setScale(v);
                  persistPrefs({ readerFontScale: v });
                }}
              >
                A−
              </Button>
              <span className="w-14 text-center tabular-nums">{scale}%</span>
              <Button
                variant="secondary"
                aria-label={t.reader.fontLarger}
                onClick={() => {
                  const v = Math.min(200, scale + 10);
                  setScale(v);
                  persistPrefs({ readerFontScale: v });
                }}
              >
                A+
              </Button>
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t.reader.theme}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "sepia", "dark"] as const).map((th) => (
                <button
                  key={th}
                  type="button"
                  aria-pressed={theme === th}
                  onClick={() => {
                    setTheme(th);
                    persistPrefs({ readerTheme: th });
                  }}
                  className={cn("rounded-xl border px-3 py-3 text-sm font-medium", theme === th ? "border-primary ring-2 ring-primary/30" : "border-line")}
                  data-reader-theme={th}
                  style={{ background: "var(--page-bg)", color: "var(--page-text)" }}
                >
                  {t.reader.themes[th]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-3">
            <span>{t.reader.translation}</span>
            <input
              type="checkbox"
              className="size-5 accent-[var(--primary)]"
              checked={translation}
              onChange={(e) => {
                setTranslation(e.target.checked);
                persistPrefs({ showTranslation: e.target.checked });
              }}
            />
          </label>
          <p className="text-xs text-muted">{t.quran.source}</p>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? fmt(t.reader.ayahActions, { ref: selected.ref }) : ""} closeLabel={t.common.close}>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={toggleBookmark}>
            <Icon name="bookmark" />
            {t.reader.bookmark}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(selected?.ref ?? "");
                toast(t.common.copied);
              } catch {
                /* ignore */
              }
              setSelected(null);
            }}
          >
            <Icon name="copy" />
            {t.reader.copyRef}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

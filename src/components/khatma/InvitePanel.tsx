"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

const noopSubscribe = () => () => undefined;

const shareButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2";

/** Invitation sharing: link, WhatsApp, Telegram, email, QR code and the native share sheet. */
export function InvitePanel({ link, qrSvg, groupName }: { link: string; qrSvg: string; groupName: string }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const canShare = useSyncExternalStore(noopSubscribe, () => "share" in navigator, () => false);
  const message = fmt(t.group.inviteMessage, { link });
  const encoded = encodeURIComponent(message);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(t.common.copied);
    } catch {
      toast(link, "info");
    }
  };
  const nativeShare = async () => {
    try {
      await navigator.share({ title: groupName, text: message.replace(link, "").trim(), url: link });
    } catch {
      /* dismissed */
    }
  };

  return (
    <Card>
      <CardTitle>{t.group.inviteTitle}</CardTitle>
      <p className="mt-1 text-muted">{t.group.inviteBody}</p>
      <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface-2 p-1.5 ps-3">
        <code className="min-w-0 flex-1 truncate text-sm" dir="ltr">
          {link}
        </code>
        <Button size="sm" onClick={copy}>
          <Icon name="copy" />
          {t.group.copyLink}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a className={shareButton} href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer">
          {t.group.whatsapp}
        </a>
        <a className={shareButton} href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message.replace(link, "").trim())}`} target="_blank" rel="noopener noreferrer">
          {t.group.telegram}
        </a>
        <a className={shareButton} href={`mailto:?subject=${encodeURIComponent(t.group.emailSubject)}&body=${encoded}`}>
          <Icon name="mail" />
          {t.group.email}
        </a>
        <button type="button" className={shareButton} onClick={() => setQrOpen(true)}>
          <Icon name="qr" />
          {t.group.qr}
        </button>
      </div>
      {canShare ? (
        <Button variant="ghost" size="sm" className="mt-2" onClick={nativeShare}>
          <Icon name="share" />
          {t.common.share}
        </Button>
      ) : null}
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={t.group.qr} closeLabel={t.common.close}>
        <div role="img" aria-label={t.group.qrAlt} className="mx-auto w-64 rounded-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="mt-3 text-center text-sm text-muted">{groupName}</p>
      </Modal>
    </Card>
  );
}

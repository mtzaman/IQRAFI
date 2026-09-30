import type { ReactNode } from "react";

/** Immersive reading layout: no app chrome, the Qur'an is the centre. */
export default function ReaderLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

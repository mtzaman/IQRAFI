import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Logo";

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-3xl px-4 py-5 sm:px-8">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-3xl space-y-4 px-4 pb-16 leading-relaxed sm:px-8 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ms-5 [&_li]:list-disc [&_p]:text-muted">
        {children}
      </main>
    </div>
  );
}

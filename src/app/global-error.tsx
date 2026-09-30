"use client";

/** Last-resort error boundary (renders without the root layout). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf7f0", color: "#1f2623", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong.</h1>
          <p style={{ color: "#56605b" }}>Your progress hasn&apos;t been lost. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 12, border: 0, background: "#0f5c45", color: "white", fontSize: 16 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

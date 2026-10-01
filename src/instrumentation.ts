/** Runs once when the Next.js server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.IQRAFI_DEMO === "1") {
    const { bootstrapDemo } = await import("./server/demo/bootstrap");
    console.log("[IQRAFI demo] Preparing the local demo database…");
    await bootstrapDemo();
    console.log("[IQRAFI demo] Ready.");
  }
}

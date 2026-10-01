/** Runs once when the Next.js server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const demo = process.env.IQRAFI_DEMO === "1";
  const autoMigrate = demo || process.env.IQRAFI_AUTO_MIGRATE === "1";
  if (!autoMigrate && !process.env.IQRAFI_ADMIN_EMAIL) return;
  const { bootstrapDatabase } = await import("./server/bootstrap");
  console.log("[IQRAFI] Preparing the database…");
  try {
    await bootstrapDatabase({ demo, adminEmail: process.env.IQRAFI_ADMIN_EMAIL });
    console.log("[IQRAFI] Database ready.");
  } catch (e) {
    console.error("[IQRAFI] Database preparation failed. Check DATABASE_URL.", e);
    if (demo) throw e;
  }
}

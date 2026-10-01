/** Seeds clearly labelled demo data for development. Refuses to run in production. */
import "dotenv/config";
import { closeDb } from "../src/lib/db";
import { DEMO_PASSWORD, DEMO_PEOPLE, demoEmail, seedDemo } from "../src/server/demo/seed";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}
if (await seedDemo()) {
  console.log(`Seeded demo group "Family Khatma" with ${DEMO_PEOPLE.length} demo users.`);
  console.log(`Sign in as ${DEMO_PEOPLE.map(demoEmail).join(", ")} (Ahmed is platform admin)`);
  console.log(`Demo password (development only): ${DEMO_PASSWORD}`);
} else {
  console.log("Demo data already present. Delete demo users first to reseed.");
}
await closeDb();

/** Grants (or with --revoke, removes) platform admin access. Usage: npm run admin:grant -- someone@example.com */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

const email = process.argv.find((a) => a.includes("@"));
const revoke = process.argv.includes("--revoke");
if (!email) {
  console.error("Usage: npm run admin:grant -- <email> [--revoke]");
  process.exit(1);
}
const rows = await db
  .update(users)
  .set({ platformRole: revoke ? "user" : "admin" })
  .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
  .returning({ id: users.id });
console.log(rows.length ? `${revoke ? "Revoked" : "Granted"} admin for ${email}` : `No user with email ${email}`);
await closeDb();

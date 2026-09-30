import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

/** Recreates the test database schema, applies migrations and seeds the Qur'an once per run. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must be set for integration tests");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL");
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await client.end();
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx tsx scripts/migrate.ts", { env, stdio: "inherit" });
  execSync("npx tsx scripts/seed-quran.ts", { env, stdio: "ignore" });
}

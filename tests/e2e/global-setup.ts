import "dotenv/config";
import { Client } from "pg";

/** E2E runs create many accounts from one IP; reset auth rate-limit windows for the run. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("delete from rate_limits where key like 'signup:%' or key like 'login:%'");
  await client.end();
}

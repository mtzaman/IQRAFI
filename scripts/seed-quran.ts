/** Loads the validated Qur'an dataset into PostgreSQL. Idempotent. */
import "dotenv/config";
import { seedQuran } from "../src/server/quran/seed";
import { closeDb } from "../src/lib/db";

const result = await seedQuran();
console.log(result);
await closeDb();

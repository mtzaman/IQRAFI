import "dotenv/config";
import { closeDb } from "../src/lib/db";
import { refreshGlobalStats } from "../src/server/services/stats";

await refreshGlobalStats();
console.log("Global statistics reconciled.");
await closeDb();

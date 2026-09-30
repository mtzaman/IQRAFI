import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
/** A transaction handle has the same query API as the database. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

const globalForDb = globalThis as unknown as { __iqrafiPool?: Pool; __iqrafiDb?: Db };

function createDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const pool = globalForDb.__iqrafiPool ?? new Pool({ connectionString, max: 10 });
  globalForDb.__iqrafiPool = pool;
  return drizzle(pool, { schema });
}

/** Lazily created so that importing modules at build time does not require a database. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    globalForDb.__iqrafiDb ??= createDb();
    return Reflect.get(globalForDb.__iqrafiDb, prop, receiver);
  },
});

export async function closeDb() {
  await globalForDb.__iqrafiPool?.end();
  globalForDb.__iqrafiPool = undefined;
  globalForDb.__iqrafiDb = undefined;
}

export { schema };

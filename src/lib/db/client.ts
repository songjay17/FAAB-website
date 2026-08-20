import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured on the server.");
  }
  // Supabase transaction-mode pooler: prepared statements aren't supported,
  // and a small per-instance pool is plenty for a 14-member league.
  const sql = postgres(url, { prepare: false, max: 3 });
  return drizzle(sql, { schema });
}

// Lazy + memoized so importing a route handler never requires DATABASE_URL
// at build time, and Next dev-mode hot reloads don't leak connections.
const globalForDb = globalThis as unknown as { __faabDb?: Db };

export function getDb(): Db {
  globalForDb.__faabDb ??= createDb();
  return globalForDb.__faabDb;
}

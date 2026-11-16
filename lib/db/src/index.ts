import fs from "node:fs";
import path from "node:path";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function resolvePgliteDataDir(): string {
  if (process.env.PGLITE_DATA_DIR) {
    return path.resolve(process.env.PGLITE_DATA_DIR);
  }
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return path.join(dir, ".local", "pglite");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(process.cwd(), ".local", "pglite");
}

let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema>;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const { bootstrapLocalDatabase } = await import("./bootstrap");

  const dataDir = resolvePgliteDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.waitReady;
  await bootstrapLocalDatabase(client);
  db = drizzlePglite(client, { schema }) as unknown as NodePgDatabase<typeof schema>;
  console.info(`[db] Using local embedded PGlite database at ${dataDir}`);
}

export { pool, db };
export * from "./schema";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function checkTables() {
  try {
    const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log("Tables in database:", result.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error checking tables:", err);
  } finally {
    process.exit(0);
  }
}

checkTables();

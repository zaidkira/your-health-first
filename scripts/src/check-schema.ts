import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'doctors'
    `);
    console.log("Doctors table columns:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Failed to query schema:", err);
  }
}

main().catch(console.error);

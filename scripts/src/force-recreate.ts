import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Dropping and recreating doctors table...");
    await db.execute(sql`DROP TABLE IF EXISTS doctors CASCADE;`);
    await db.execute(sql`
      CREATE TABLE doctors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        wilaya TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        rating REAL NOT NULL DEFAULT 4.0,
        review_count INTEGER NOT NULL DEFAULT 0,
        available_days TEXT NOT NULL,
        available_hours TEXT NOT NULL DEFAULT '08:00 - 17:00',
        consultation_fee INTEGER NOT NULL,
        image_url TEXT,
        is_online_consultation BOOLEAN NOT NULL DEFAULT FALSE,
        lat REAL,
        lng REAL
      );
    `);
    console.log("Recreation successful!");
  } catch (err) {
    console.error("Recreation failed:", err);
  }
}

main().catch(console.error);

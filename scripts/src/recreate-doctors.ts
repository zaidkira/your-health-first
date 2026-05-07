import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Re-creating doctors table...");
    await client.query(`DROP TABLE IF EXISTS doctors CASCADE;`);
    await client.query(`
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
    console.log("Doctors table recreated successfully!");
  } catch (err) {
    console.error("Failed to recreate table:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: "postgresql://postgres.pbrnnnvaunwpvzweniqa:DendaneZaid30@@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB");
    
    // Add device_id to users if not exists
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT UNIQUE;
    `);
    console.log("Column device_id added to users table.");

    // Create bracelet_readings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bracelet_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id),
        heart_rate INTEGER NOT NULL,
        spo2 INTEGER NOT NULL,
        steps INTEGER NOT NULL,
        activity TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        device_id TEXT NOT NULL
      );
    `);
    console.log("Table bracelet_readings created successfully.");

  } catch (err) {
    console.error("Error during manual DB fix:", err);
  } finally {
    await client.end();
  }
}

run();

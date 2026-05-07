import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Try to insert a dummy doctor to see the error
    const query = `
      INSERT INTO "doctors" 
      ("name", "specialty", "wilaya", "address", "phone", "rating", "review_count", "available_days", "available_hours", "consultation_fee", "is_online_consultation")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    const params = ["Test Doc", "Dermatologist", "Adrar", "12 adrar", "0987654321", 4.0, 0, "Mon-Fri", "08:00 - 17:00", 2000, false];
    
    await client.query(query, params);
    console.log("Insert successful!");
  } catch (err: any) {
    console.error("Insert failed!");
    console.error("Message:", err.message);
    console.error("Detail:", err.detail);
    console.error("Code:", err.code);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

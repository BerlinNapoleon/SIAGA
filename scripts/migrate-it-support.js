require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateSupport() {
  try {
    await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
    await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('requester','approver','admin','it_support'))");
    const hash = bcrypt.hashSync('password', 10);
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ('Raka IT Support', 'raka@siaga.local', $1, 'it_support', 'IT Support')
      ON CONFLICT (email) DO NOTHING
    `, [hash]);
    console.log('IT support role and user ready: raka@siaga.local / password');
  } finally {
    await pool.end();
  }
}

migrateSupport().catch(console.error);

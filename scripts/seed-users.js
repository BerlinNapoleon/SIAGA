require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedUsers() {
  try {
    const hash = bcrypt.hashSync('password', 10);
    console.log('Seeding test users...');
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, department) VALUES 
      ('Budi Santoso', 'budi@siaga.local', $1, 'requester', 'Engineering'),
      ('Sari Dewi', 'sari@siaga.local', $1, 'approver', 'IT Ops')
      ON CONFLICT (email) DO NOTHING;
    `, [hash]);
    console.log('Test users created:');
    console.log('- Requester: budi@siaga.local / password');
    console.log('- Approver: sari@siaga.local / password');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

seedUsers();

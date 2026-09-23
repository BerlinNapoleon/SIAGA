const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/siaga',
});

async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('Running schema.sql...');
    await pool.query(schema);
    console.log('Database initialized successfully.');
    
    // Seed admin if not exist
    const adminCheck = await pool.query(`SELECT id FROM users WHERE email = 'admin@siaga.local'`);
    if (adminCheck.rows.length === 0) {
      // password: "password"
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('password', 10);
      await pool.query(`
        INSERT INTO users (name, email, password_hash, role, department) 
        VALUES ('Admin System', 'admin@siaga.local', $1, 'admin', 'IT')
      `, [hash]);
      console.log('Default admin created: admin@siaga.local / password');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    pool.end();
  }
}

initDB();

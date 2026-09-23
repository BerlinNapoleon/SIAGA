require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedCategories() {
  try {
    console.log('Seeding categories...');
    await pool.query(`
      INSERT INTO categories (name, description, requires_levels) VALUES 
      ('Cuti Karyawan', 'Pengajuan cuti tahunan atau khusus', 1),
      ('Perubahan Akses Sistem', 'Permintaan akses VPN, Database, dll', 2),
      ('IT Support', 'Permintaan perbaikan hardware/software', 1),
      ('Approval Limit Transaksi', 'Kenaikan limit transaksi sementara', 2)
      ON CONFLICT DO NOTHING;
    `);
    console.log('Categories seeded successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

seedCategories();

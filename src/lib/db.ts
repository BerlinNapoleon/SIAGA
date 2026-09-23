import { Pool } from 'pg';

// Use a fallback for build time / dev time if env is not set
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/siaga',
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query('SELECT id, name, email, role, department, is_active, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { name, email, role, department } = await req.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
    }

    await client.query('BEGIN');

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const defaultPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const result = await client.query(`
      INSERT INTO users (name, email, password_hash, role, department, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, name, email, role, department
    `, [name, email, hashedPassword, role, department || null]);

    const newUser = result.rows[0];

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'CREATE_USER', 'user', $2, $3, $4)
    `, [user.id, newUser.id, `Admin created new user: ${email} (${role})`, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json({ 
      user: newUser, 
      temporaryPassword: defaultPassword,
      message: 'User berhasil dibuat. Password sementara telah ditampilkan di atas.' 
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

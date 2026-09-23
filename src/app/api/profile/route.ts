import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query('SELECT id, name, email, role, department, created_at FROM users WHERE id = $1', [user.id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { name, department } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    await client.query(
      'UPDATE users SET name = $1, department = $2, updated_at = NOW() WHERE id = $3',
      [name, department || null, user.id]
    );

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'UPDATE_PROFILE', 'user', $2, 'User updated their profile', $3)
    `, [user.id, user.id, req.ip || '']);

    await client.query('COMMIT');

    const result = await client.query('SELECT id, name, email, role, department FROM users WHERE id = $1', [user.id]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

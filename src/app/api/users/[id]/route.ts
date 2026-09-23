import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { is_active } = await req.json();
    const userId = parseInt(params.id);

    if (userId === user.id) {
      return NextResponse.json({ error: 'Tidak bisa mengubah status user Anda sendiri' }, { status: 400 });
    }

    await client.query('BEGIN');

    const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = userRes.rows[0];

    await client.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [is_active, userId]
    );

    const action = is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER';
    const description = is_active 
      ? `Admin activated user: ${targetUser.email}` 
      : `Admin deactivated user: ${targetUser.email}`;

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, $2, 'user', $3, $4, $5)
    `, [user.id, action, userId, description, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      message: is_active ? 'User berhasil diaktifkan' : 'User berhasil dinonaktifkan'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

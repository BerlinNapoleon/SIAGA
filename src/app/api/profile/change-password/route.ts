import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { oldPassword, newPassword, confirmPassword } = await req.json();

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    await client.query('BEGIN');

    const userRes = await client.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    if (userRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = userRes.rows[0];
    const isOldPasswordValid = await bcrypt.compare(oldPassword, userRecord.password_hash);

    if (!isOldPasswordValid) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'CHANGE_PASSWORD', 'user', $2, 'User changed their password', $3)
    `, [user.id, user.id, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

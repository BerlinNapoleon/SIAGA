import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(`
      SELECT * FROM notifications 
      WHERE recipient_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [user.id]);
    
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { notificationId, is_read } = await req.json();

    await client.query('BEGIN');

    const notifRes = await client.query(
      'SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2',
      [notificationId, user.id]
    );

    if (notifRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await client.query(
      'UPDATE notifications SET is_read = $1 WHERE id = $2',
      [is_read, notificationId]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

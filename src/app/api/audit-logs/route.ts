import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const actor = searchParams.get('actor');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions: string[] = [];
  const values: string[] = [];

  if (action) {
    values.push(action);
    conditions.push(`a.action_type = $${values.length}`);
  }

  if (actor) {
    values.push(`%${actor}%`);
    conditions.push(`COALESCE(u.name, '') ILIKE $${values.length}`);
  }

  if (from) {
    values.push(from);
    conditions.push(`a.created_at >= $${values.length}`);
  }

  if (to) {
    values.push(to);
    conditions.push(`a.created_at <= $${values.length}::date + interval '1 day'`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await query(`
      SELECT a.*, u.name as actor_name, u.email as actor_email
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 200
    `, values);

    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

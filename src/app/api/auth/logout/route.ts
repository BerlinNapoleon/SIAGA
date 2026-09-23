import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await query(`
      INSERT INTO audit_logs (actor_id, action_type, description, ip_address, user_agent)
      VALUES ($1, 'LOGOUT', 'User logged out', $2, $3)
    `, [user.id, req.ip || '', req.headers.get('user-agent') || '']);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

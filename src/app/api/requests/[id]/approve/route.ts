import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'approver') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = params;
    const { action, notes } = await req.json(); // approved, rejected, revision_needed

    await query('BEGIN');

    const requestRes = await query(`
      SELECT r.*, c.requires_levels 
      FROM requests r
      JOIN categories c ON r.category_id = c.id
      WHERE r.id = $1
    `, [id]);
    
    if (requestRes.rowCount === 0) throw new Error('Not found');
    const reqData = requestRes.rows[0];

    // Insert approval step
    await query(`
      INSERT INTO approval_steps (request_id, approver_id, level, action, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, user.id, reqData.current_level, action, notes]);

    // Update Status
    let newStatus = reqData.status;
    let newLevel = reqData.current_level;

    if (action === 'rejected') {
      newStatus = 'rejected';
    } else if (action === 'revision_needed') {
      newStatus = 'revision';
    } else if (action === 'approved') {
      if (reqData.current_level < reqData.requires_levels) {
        newStatus = 'in_review';
        newLevel++;
      } else {
        newStatus = 'approved';
      }
    }

    await query(`
      UPDATE requests 
      SET status = $1, current_level = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, newLevel, id]);

    await query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, $2, 'request', $3, $4, $5)
    `, [user.id, action.toUpperCase(), id, `Request ${action} by approver`, req.ip || '']);

    await query('COMMIT');
    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    await query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

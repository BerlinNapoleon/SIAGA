import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'approver') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { id } = params;
    const { action, notes } = await req.json();

    await client.query('BEGIN');

    const requestRes = await client.query(`
      SELECT r.*, c.requires_levels 
      FROM requests r
      JOIN categories c ON r.category_id = c.id
      WHERE r.id = $1
    `, [id]);
    
    if (requestRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const reqData = requestRes.rows[0];

    if (!['pending', 'in_review'].includes(reqData.status)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Request status tidak sesuai untuk approval' }, { status: 400 });
    }

    if (reqData.requester_id === user.id && action === 'approved') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Maker-checker: Anda tidak bisa menyetujui request Anda sendiri' }, { status: 403 });
    }

    const existingApprovalRes = await client.query(
      `SELECT * FROM approval_steps WHERE request_id = $1 AND approver_id = $2 AND level = $3`,
      [id, user.id, reqData.current_level]
    );
    if (existingApprovalRes.rowCount > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Anda sudah melakukan aksi approval untuk request ini pada level ini' }, { status: 400 });
    }

    await client.query(`
      INSERT INTO approval_steps (request_id, approver_id, level, action, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, user.id, reqData.current_level, action, notes]);

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

    await client.query(`
      UPDATE requests 
      SET status = $1, current_level = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, newLevel, id]);

    const requesterRes = await client.query('SELECT id FROM users WHERE id = $1', [reqData.requester_id]);
    if (requesterRes.rowCount > 0) {
      let message = '';
      if (action === 'approved') {
        if (newStatus === 'approved') {
          message = `Request #${id} telah disetujui oleh semua approver.`;
        } else {
          message = `Request #${id} telah disetujui oleh approver level ${reqData.current_level} dan menunggu persetujuan selanjutnya.`;
        }
      } else if (action === 'rejected') {
        message = `Request #${id} telah ditolak. Alasan: ${notes}`;
      } else if (action === 'revision_needed') {
        message = `Request #${id} memerlukan revisi. Instruksi: ${notes}`;
      }
      if (message) {
        await client.query(`
          INSERT INTO notifications (recipient_id, request_id, message)
          VALUES ($1, $2, $3)
        `, [reqData.requester_id, id, message]);
      }
    }

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, $2, 'request', $3, $4, $5)
    `, [user.id, action.toUpperCase(), id, `Request ${action} by approver at level ${reqData.current_level}`, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

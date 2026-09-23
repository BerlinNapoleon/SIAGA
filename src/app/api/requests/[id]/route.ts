import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { unlink, writeFile } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = params;

    const requestRes = await query(`
      SELECT r.*, u.name as requester_name, u.department, c.name as category_name 
      FROM requests r
      JOIN users u ON r.requester_id = u.id
      JOIN categories c ON r.category_id = c.id
      WHERE r.id = $1
    `, [id]);

    if (requestRes.rowCount === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const request = requestRes.rows[0];

    const attachmentsRes = await query('SELECT * FROM attachments WHERE request_id = $1', [id]);
    request.attachments = attachmentsRes.rows;

    const stepsRes = await query(`
      SELECT s.*, u.name as approver_name 
      FROM approval_steps s
      JOIN users u ON s.approver_id = u.id
      WHERE request_id = $1 ORDER BY acted_at ASC
    `, [id]);
    request.approval_steps = stepsRes.rows;

    return NextResponse.json(request);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'requester') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = params;
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const leave_date = formData.get('leave_date') as string;
    const file = formData.get('file') as File | null;

    await query('BEGIN');

    const reqCheck = await query('SELECT * FROM requests WHERE id = $1 AND requester_id = $2', [id, user.id]);
    if (reqCheck.rowCount === 0) throw new Error('Not found or unauthorized');
    const existingReq = reqCheck.rows[0];

    if (existingReq.status !== 'revision') throw new Error('Hanya request dengan status revisi yang bisa diubah');

    await query(`
      UPDATE requests 
      SET title = $1, description = $2, priority = $3, leave_date = $4, status = 'pending', updated_at = NOW()
      WHERE id = $5
    `, [title, description, priority || 'medium', leave_date ? leave_date : null, id]);

    if (file && file.size > 0) {
      const oldAttachments = await query('SELECT file_url FROM attachments WHERE request_id = $1', [id]);

      for (const attachment of oldAttachments.rows) {
        const relativePath = attachment.file_url.replace(/^\//, '');
        const filePath = path.join(process.cwd(), 'public', relativePath);
        await unlink(filePath).catch(() => null);
      }

      await query('DELETE FROM attachments WHERE request_id = $1', [id]);

      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
      await writeFile(uploadPath, buffer);

      await query(`
        INSERT INTO attachments (request_id, file_name, file_url)
        VALUES ($1, $2, $3)
      `, [id, file.name, `/uploads/${filename}`]);
    }

    await query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'UPDATE_REQUEST', 'request', $2, 'User resubmitted revised request', $3)
    `, [user.id, id, req.ip || '']);

    await query('COMMIT');
    return NextResponse.json({ success: true, status: 'pending' });
  } catch (error) {
    await query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

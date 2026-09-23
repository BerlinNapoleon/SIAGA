import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'it_support') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const formData = await req.formData();
    const notes = formData.get('notes') as string;
    const file = formData.get('file') as File | null;

    if (!notes) {
      return NextResponse.json({ error: 'Resolution notes are required' }, { status: 400 });
    }

    await client.query('BEGIN');

    const requestRes = await client.query(`
      SELECT r.*, c.name as category_name
      FROM requests r
      JOIN categories c ON r.category_id = c.id
      WHERE r.id = $1
    `, [params.id]);

    if (requestRes.rowCount === 0 || requestRes.rows[0].category_name !== 'IT Support') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invalid IT Support request' }, { status: 400 });
    }

    const requestData = requestRes.rows[0];

    if (!['pending', 'in_review'].includes(requestData.status)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Request status tidak sesuai untuk resolusi' }, { status: 400 });
    }

    await client.query(`
      INSERT INTO approval_steps (request_id, approver_id, level, action, notes)
      VALUES ($1, $2, $3, 'approved', $4)
    `, [params.id, user.id, requestData.current_level, notes]);

    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-support-${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(uploadDir, filename);
      await writeFile(uploadPath, buffer);

      await client.query(`
        INSERT INTO attachments (request_id, file_name, file_url)
        VALUES ($1, $2, $3)
      `, [params.id, file.name, `/uploads/${filename}`]);
    }

    await client.query(`
      UPDATE requests
      SET status = 'approved', updated_at = NOW()
      WHERE id = $1
    `, [params.id]);

    await client.query(`
      INSERT INTO notifications (recipient_id, request_id, message)
      VALUES ($1, $2, $3)
    `, [requestData.requester_id, params.id, `IT Support ticket #${params.id} telah diselesaikan. Catatan: ${notes}`]);

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'IT_SUPPORT_RESOLVE', 'request', $2, 'IT Support marked request as resolved', $3)
    `, [user.id, params.id, req.ip || '']);

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

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let requests;
    if (user.role === 'requester') {
      const result = await query('SELECT * FROM requests WHERE requester_id = $1 ORDER BY created_at DESC', [user.id]);
      requests = result.rows;
    } else if (user.role === 'approver') {
      const result = await query(`
        SELECT r.*, u.name as requester_name, c.name as category_name 
        FROM requests r
        JOIN users u ON r.requester_id = u.id
        JOIN categories c ON r.category_id = c.id
        WHERE r.status IN ('pending', 'in_review') AND c.name <> 'IT Support'
        ORDER BY r.created_at DESC
      `);
      requests = result.rows;
    } else if (user.role === 'it_support') {
      const result = await query(`
        SELECT r.*, u.name as requester_name, c.name as category_name 
        FROM requests r
        JOIN users u ON r.requester_id = u.id
        JOIN categories c ON r.category_id = c.id
        WHERE r.status IN ('pending', 'in_review') AND c.name = 'IT Support'
        ORDER BY r.created_at DESC
      `);
      requests = result.rows;
    } else {
      const result = await query('SELECT * FROM requests ORDER BY created_at DESC');
      requests = result.rows;
    }

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'requester') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const category_id = formData.get('category_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const leave_date = formData.get('leave_date') as string;
    const file = formData.get('file') as File | null;

    await query('BEGIN');

    const result = await query(`
      INSERT INTO requests (requester_id, category_id, title, description, priority, status, leave_date)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING *
    `, [user.id, parseInt(category_id), title, description, priority || 'medium', leave_date ? leave_date : null]);

    const newRequest = result.rows[0];

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
      
      await writeFile(uploadPath, buffer);

      await query(`
        INSERT INTO attachments (request_id, file_name, file_url)
        VALUES ($1, $2, $3)
      `, [newRequest.id, file.name, `/uploads/${filename}`]);
    }

    await query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'CREATE_REQUEST', 'request', $2, 'User created a new request', $3)
    `, [user.id, newRequest.id, req.ip || '']);

    await query('COMMIT');
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    await query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

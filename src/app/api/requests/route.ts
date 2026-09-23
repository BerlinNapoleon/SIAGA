import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'requester') {
      whereConditions.push('r.requester_id = $1');
      params.push(user.id);
    } else if (user.role === 'approver') {
      whereConditions.push("c.name <> 'IT Support'");
      whereConditions.push("r.status IN ('pending', 'in_review')");
    } else if (user.role === 'it_support') {
      whereConditions.push("c.name = 'IT Support'");
      whereConditions.push("r.status IN ('pending', 'in_review')");
    }

    const conditions = [...whereConditions];
    const values = [...params];

    if (status !== 'all') {
      conditions.push(`r.status = $${values.length + 1}`);
      values.push(status);
    }

    if (category !== 'all') {
      conditions.push(`c.id = $${values.length + 1}`);
      values.push(parseInt(category));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'r.created_at DESC';
    if (sort === 'oldest') orderBy = 'r.created_at ASC';
    if (sort === 'priority-high') orderBy = "CASE WHEN r.priority = 'high' THEN 1 WHEN r.priority = 'medium' THEN 2 ELSE 3 END ASC, r.created_at DESC";

    const countRes = await query(`
      SELECT COUNT(*)::int as total
      FROM requests r
      JOIN users u ON r.requester_id = u.id
      JOIN categories c ON r.category_id = c.id
      ${whereClause}
    `, values);

    const total = countRes.rows[0].total;

    const result = await query(`
      SELECT r.*, u.name as requester_name, c.name as category_name 
      FROM requests r
      JOIN users u ON r.requester_id = u.id
      JOIN categories c ON r.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, pageSize, offset]);

    return NextResponse.json({
      items: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'requester') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const formData = await req.formData();
    const category_id = formData.get('category_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const leave_date = formData.get('leave_date') as string;
    const file = formData.get('file') as File | null;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO requests (requester_id, category_id, title, description, priority, status, leave_date)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING *
    `, [user.id, parseInt(category_id), title, description, priority || 'medium', leave_date ? leave_date : null]);

    const newRequest = result.rows[0];

    if (file) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(uploadDir, filename);
      
      await writeFile(uploadPath, buffer);

      await client.query(`
        INSERT INTO attachments (request_id, file_name, file_url)
        VALUES ($1, $2, $3)
      `, [newRequest.id, file.name, `/uploads/${filename}`]);
    }

    const categoryRes = await client.query('SELECT name FROM categories WHERE id = $1', [parseInt(category_id)]);
    const categoryName = categoryRes.rows[0]?.name || '';

    const approversRes = await client.query(
      "SELECT id FROM users WHERE role = $1 AND is_active = true",
      [categoryName === 'IT Support' ? 'it_support' : 'approver']
    );
    for (const approver of approversRes.rows) {
      await client.query(`
        INSERT INTO notifications (recipient_id, request_id, message)
        VALUES ($1, $2, $3)
      `, [approver.id, newRequest.id, `Request baru "${title}" memerlukan persetujuan Anda.`]);
    }

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'CREATE_REQUEST', 'request', $2, 'User created a new request', $3)
    `, [user.id, newRequest.id, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

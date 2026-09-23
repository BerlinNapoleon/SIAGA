import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query('SELECT * FROM categories ORDER BY id ASC');
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { name, description, requires_levels } = await req.json();

    if (!name || !requires_levels) {
      return NextResponse.json({ error: 'Name and requires_levels are required' }, { status: 400 });
    }

    await client.query('BEGIN');

    const existingCategory = await client.query('SELECT id FROM categories WHERE name = $1', [name]);
    if (existingCategory.rowCount && existingCategory.rowCount > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }

    const result = await client.query(`
      INSERT INTO categories (name, description, requires_levels, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING *
    `, [name, description || null, requires_levels]);

    const newCategory = result.rows[0];

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, 'CREATE_CATEGORY', 'category', $2, $3, $4)
    `, [user.id, newCategory.id, `Admin created category: ${name}`, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

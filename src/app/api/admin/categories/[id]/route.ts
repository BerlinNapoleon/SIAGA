import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await getClient();
  try {
    const { is_active } = await req.json();
    const categoryId = parseInt(params.id);

    await client.query('BEGIN');

    const categoryRes = await client.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    if (categoryRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const category = categoryRes.rows[0];

    await client.query(
      'UPDATE categories SET is_active = $1 WHERE id = $2',
      [is_active, categoryId]
    );

    const action = is_active ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY';
    const description = is_active 
      ? `Admin activated category: ${category.name}` 
      : `Admin deactivated category: ${category.name}`;

    await client.query(`
      INSERT INTO audit_logs (actor_id, action_type, target_type, target_id, description, ip_address)
      VALUES ($1, $2, 'category', $3, $4, $5)
    `, [user.id, action, categoryId, description, req.ip || '']);

    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      message: is_active ? 'Category berhasil diaktifkan' : 'Category berhasil dinonaktifkan'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

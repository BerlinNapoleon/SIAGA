import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let baseWhere = '';
    const params: string[] = [];

    if (user.role === 'requester') {
      params.push(user.id);
      baseWhere = `WHERE requester_id = $1`;
    } else if (user.role === 'it_support') {
      baseWhere = `WHERE category_id = (SELECT id FROM categories WHERE name = 'IT Support' LIMIT 1)`;
    }

    const totals = await query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
        COUNT(*) FILTER (WHERE status = 'revision')::int as revision,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int as today
      FROM requests
      ${baseWhere}
    `, params);

    const requestJoinFilter = user.role === 'requester'
      ? 'AND r.requester_id = $1'
      : user.role === 'it_support'
        ? "AND r.category_id = (SELECT id FROM categories WHERE name = 'IT Support' LIMIT 1)"
        : '';

    const categoryWhere = user.role === 'it_support' ? "WHERE c.name = 'IT Support'" : '';

    const byCategory = await query(`
      SELECT c.name, COUNT(r.id)::int as count
      FROM categories c
      LEFT JOIN requests r ON r.category_id = c.id ${requestJoinFilter}
      ${categoryWhere}
      GROUP BY c.name
      ORDER BY count DESC, c.name ASC
    `, params);

    const weekly = await query(`
      SELECT TO_CHAR(day, 'Dy') as label, COALESCE(COUNT(r.id), 0)::int as count
      FROM generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, interval '1 day') day
      LEFT JOIN requests r ON r.created_at::date = day::date ${requestJoinFilter}
      GROUP BY day
      ORDER BY day ASC
    `, params);

    const approvalRate = totals.rows[0].total > 0
      ? Math.round((totals.rows[0].approved / totals.rows[0].total) * 100)
      : 0;

    return NextResponse.json({
      totals: {
        ...totals.rows[0],
        approvalRate,
      },
      byCategory: byCategory.rows,
      weekly: weekly.rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

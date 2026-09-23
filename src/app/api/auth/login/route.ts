import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !user.is_active) {
      // Log login failure
      await query(`
        INSERT INTO audit_logs (action_type, description, ip_address, user_agent)
        VALUES ('LOGIN_FAILED', 'Failed login attempt for email: ' || $1, $2, $3)
      `, [email, req.ip || '', req.headers.get('user-agent') || '']);
      
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await query(`
        INSERT INTO audit_logs (action_type, description, ip_address, user_agent)
        VALUES ('LOGIN_FAILED', 'Failed login attempt for email: ' || $1, $2, $3)
      `, [email, req.ip || '', req.headers.get('user-agent') || '']);
      
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Login success
    const token = signToken({ id: user.id, role: user.role, name: user.name });

    await query(`
      INSERT INTO audit_logs (actor_id, action_type, description, ip_address, user_agent)
      VALUES ($1, 'LOGIN', 'User logged in successfully', $2, $3)
    `, [user.id, req.ip || '', req.headers.get('user-agent') || '']);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

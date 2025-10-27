import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function GET() {
  try {
    const isValid = await validateSession();

    if (!isValid) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        username: 'admin',
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('[Auth] Me error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

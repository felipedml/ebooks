import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessoes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, fluxoId, userId, metadata } = body;

    if (!sessionId || !fluxoId) {
      return NextResponse.json(
        { error: 'sessionId e fluxoId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se sessão já existe
    const sessaoExistente = await db
      .select()
      .from(sessoes)
      .where(eq(sessoes.sessionId, sessionId))
      .limit(1);

    // Se já existe, retornar a existente
    if (sessaoExistente.length > 0) {
      console.log('[API] Session already exists, returning existing:', sessaoExistente[0]);
      return NextResponse.json({
        success: true,
        sessao: sessaoExistente[0],
        existing: true,
      });
    }

    // Criar nova sessão
    try {
      const novaSessao = await db.insert(sessoes).values({
        sessionId,
        fluxoId,
        userId: userId || null,
        status: 'em_andamento',
        currentStepIndex: 0,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }).returning();

      console.log('[API] New session created:', novaSessao[0]);

      return NextResponse.json({
        success: true,
        sessao: novaSessao[0],
        existing: false,
      });
    } catch (insertError: unknown) {
      // Log para debug
      console.log('[API] Insert error caught:', (insertError as { code?: string }).code, (insertError as { message?: string }).message);
      
      // Se erro for UNIQUE constraint (race condition), buscar sessão existente
      const isUniqueConstraint = 
        (insertError as { code?: string }).code === 'SQLITE_CONSTRAINT' ||
        (insertError as { message?: string }).message?.includes('UNIQUE constraint') ||
        (insertError as { message?: string }).message?.includes('UNIQUE') ||
        ((insertError as { cause?: { code?: string } }).cause && (insertError as { cause?: { code?: string } }).cause?.code === 'SQLITE_CONSTRAINT');
      
      if (isUniqueConstraint) {
        console.log('[API] Race condition detected, fetching existing session');
        const sessaoExistente = await db
          .select()
          .from(sessoes)
          .where(eq(sessoes.sessionId, sessionId))
          .limit(1);
        
        if (sessaoExistente.length > 0) {
          console.log('[API] Returning existing session from race condition handler');
          return NextResponse.json({
            success: true,
            sessao: sessaoExistente[0],
            existing: true,
          });
        }
      }
      
      console.log('[API] Not a race condition, throwing error');
      throw insertError; // Se não for race condition, propagar erro
    }
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão' },
      { status: 500 }
    );
  }
}

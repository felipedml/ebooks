import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessoes, respostasFluxo } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Buscar sessão
    const sessao = await db
      .select()
      .from(sessoes)
      .where(eq(sessoes.sessionId, sessionId))
      .limit(1);

    if (sessao.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Buscar interações da sessão
    const interacoes = await db
      .select()
      .from(respostasFluxo)
      .where(eq(respostasFluxo.sessaoId, sessao[0].id));

    return NextResponse.json({
      success: true,
      sessao: sessao[0],
      interacoes,
    });
  } catch (error) {
    console.error('Erro ao buscar sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar sessão' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { status, currentStepIndex, completedAt, contactData } = body;

    const updates: Record<string, unknown> = {
      lastInteractionAt: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (currentStepIndex !== undefined) updates.currentStepIndex = currentStepIndex;
    if (completedAt) updates.completedAt = completedAt;
    if (contactData) updates.contactData = JSON.stringify(contactData);

    // Atualizar sessão
    const updated = await db
      .update(sessoes)
      .set(updates)
      .where(eq(sessoes.sessionId, sessionId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessao: updated[0],
    });
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar sessão' },
      { status: 500 }
    );
  }
}

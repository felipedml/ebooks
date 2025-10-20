import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessoes, respostasFluxo, steps, sessoesContatos } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { stepIndex, stepType, resposta } = body;

    if (stepIndex === undefined || !stepType || !resposta) {
      return NextResponse.json(
        { error: 'stepIndex, stepType e resposta são obrigatórios' },
        { status: 400 }
      );
    }

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

    // Resolver step_id pelo fluxo + índice usando ordenação + offset (evita off-by-one)
    const stepRow = await db
      .select({ id: steps.id })
      .from(steps)
      .where(eq(steps.fluxoId, sessao[0].fluxoId))
      .orderBy(steps.ordem)
      .limit(1)
      .offset(stepIndex);

    if (stepRow.length === 0) {
      return NextResponse.json(
        { error: `Step não encontrado para fluxo ${sessao[0].fluxoId} e índice ${stepIndex}` },
        { status: 400 }
      );
    }

    // Salvar interação (inclui step_id exigido pelo schema original)
    const novaInteracao = await db
      .insert(respostasFluxo)
      .values({
        fluxoId: sessao[0].fluxoId,
        stepId: stepRow[0].id,
        sessaoId: sessao[0].id,
        stepIndex,
        stepType,
        resposta: JSON.stringify(resposta),
      })
      .returning();

    // Se for dado de contato, atualizar sessão imediatamente (merge) e upsert em tabela normalizada
    try {
      const maybeContact = resposta as { isContactData?: boolean; variable?: string; value?: string };
      if (maybeContact?.isContactData && maybeContact.variable) {
        const current = sessao[0].contactData ? JSON.parse(sessao[0].contactData as unknown as string) : {};
        const updatedContact = { ...current, [maybeContact.variable]: maybeContact.value };
        await db
          .update(sessoes)
          .set({ contactData: JSON.stringify(updatedContact) })
          .where(eq(sessoes.id, sessao[0].id));

        // Normalizar valor para busca: email -> lower/trim; phone -> apenas dígitos; demais -> lower/trim
        const key = maybeContact.variable;
        const rawValue = (maybeContact.value ?? '').trim();
        const lower = rawValue.toLowerCase();
        const onlyDigits = rawValue.replace(/\D+/g, '');
        const isEmail = key.toLowerCase().includes('email');
        const isPhone = /(phone|fone|tel|cel)/i.test(key);
        const valueNormalized = isEmail ? lower : isPhone ? onlyDigits : lower;

        // Upsert na tabela normalizada de contatos
        await db
          .insert(sessoesContatos)
          .values({
            sessaoId: sessao[0].id,
            contactKey: key,
            value: rawValue,
            valueNormalized,
          })
          .onConflictDoUpdate({
            target: [sessoesContatos.sessaoId, sessoesContatos.contactKey],
            set: {
              value: rawValue,
              valueNormalized,
              updatedAt: new Date().toISOString(),
            },
          });
      }
    } catch (e) {
      console.warn('[API] Falha ao atualizar contactData incrementalmente:', e);
    }

    // Atualizar last_interaction_at e current_step_index da sessão
    await db
      .update(sessoes)
      .set({
        lastInteractionAt: new Date().toISOString(),
        currentStepIndex: stepIndex,
      })
      .where(eq(sessoes.id, sessao[0].id));

    return NextResponse.json({
      success: true,
      interacao: novaInteracao[0],
    });
  } catch (error) {
    console.error('Erro ao salvar interação:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar interação' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { steps } from '@/lib/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

type Step = InferSelectModel<typeof steps>;

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  console.log('[API /steps GET] 🔍 Iniciando...');
  
  try {
    const { searchParams } = new URL(request.url);
    const fluxoId = searchParams.get('fluxoId');
    console.log('[API /steps GET] fluxoId:', fluxoId);

    if (!fluxoId) {
      return corsResponse(
        { 
          success: false,
          error: 'fluxoId é obrigatório' 
        },
        { status: 400, origin }
      );
    }

    console.log('[API /steps GET] Executando query para fluxoId:', parseInt(fluxoId));
    const stepsFluxo = await db.select()
      .from(steps)
      .where(eq(steps.fluxoId, parseInt(fluxoId)))
      .orderBy(asc(steps.ordem));
    
    console.log('[API /steps GET] ✅ Steps encontrados:', stepsFluxo.length);

    return corsResponse(
      {
        success: true,
        steps: stepsFluxo
      },
      { origin }
    );
  } catch (error) {
    console.error('[API] Erro ao buscar steps:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao buscar steps',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body = await request.json();
    const { fluxoId, fluxo_id, ordem, tipo, conteudo, proximoStep, ativo } = body;

    // Accept both fluxoId and fluxo_id
    const flowId = fluxoId || fluxo_id;

    if (!flowId || !tipo || !conteudo) {
      return corsResponse(
        { 
          success: false,
          error: 'fluxoId, tipo e conteudo são obrigatórios' 
        },
        { status: 400, origin }
      );
    }

    // Se não especificou ordem, colocar no final
    let ordemFinal = ordem;
    if (ordemFinal === undefined) {
      const ultimoStep = await db.select()
        .from(steps)
        .where(eq(steps.fluxoId, parseInt(flowId)))
        .orderBy(desc(steps.ordem))
        .limit(1);

      ordemFinal = ultimoStep.length > 0 ? (ultimoStep[0].ordem ?? 0) + 1 : 0;
    }

    const [novoStep] = await db.insert(steps).values({
      fluxoId: parseInt(flowId),
      ordem: ordemFinal,
      tipo,
      conteudo: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo),
      proximoStep: proximoStep || null,
      ativo: ativo ?? true,
    }).returning();

    return corsResponse(
      {
        success: true,
        step: novoStep,
        message: 'Step criado com sucesso!'
      },
      { origin }
    );

  } catch (error) {
    console.error('[API] Erro ao criar step:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao criar step',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body = await request.json();
    const { id, ordem, tipo, conteudo, condicoes, proximoStep, ativo, move, fluxoId } = body;

    if (!id) {
      return corsResponse(
        { 
          success: false,
          error: 'ID é obrigatório' 
        },
        { status: 400, origin }
      );
    }

    // Reordenação rápida: mover para cima/baixo trocando com vizinho
    if (move && fluxoId) {
      const stepAtualArr = await db.select().from(steps).where(eq(steps.id, id)).limit(1);
      const stepAtual = stepAtualArr[0];
      if (!stepAtual) {
        return corsResponse(
          { success: false, error: 'Step não encontrado' },
          { status: 404, origin }
        );
      }

      const alvoOrdem = move === 'up' ? (stepAtual.ordem ?? 0) - 1 : (stepAtual.ordem ?? 0) + 1;
      const vizinhoArr = await db
        .select()
        .from(steps)
        .where(eq(steps.fluxoId, parseInt(String(fluxoId))))
        .orderBy(asc(steps.ordem));

      const vizinho = vizinhoArr.find((s: Step) => (s.ordem ?? 0) === alvoOrdem);
      if (!vizinho) {
        // Nada a fazer se não existir vizinho nessa direção
        return corsResponse(
          { success: true, message: 'Borda alcançada, sem reordenação' },
          { origin }
        );
      }

      // Trocar as ordens
      await db.update(steps).set({ ordem: vizinho.ordem }).where(eq(steps.id, stepAtual.id));
      await db.update(steps).set({ ordem: stepAtual.ordem }).where(eq(steps.id, vizinho.id));

      return corsResponse(
        { success: true, message: 'Ordem atualizada com sucesso' },
        { origin }
      );
    }

    const [stepAtualizado] = await db.update(steps)
      .set({
        ...(ordem !== undefined && { ordem }),
        ...(tipo && { tipo }),
        ...(conteudo && { conteudo: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo) }),
        ...(condicoes !== undefined && { condicoes: condicoes ? (typeof condicoes === 'string' ? condicoes : JSON.stringify(condicoes)) : null }),
        ...(proximoStep !== undefined && { proximoStep }),
        ...(ativo !== undefined && { ativo }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(steps.id, id))
      .returning();

    if (!stepAtualizado) {
      return corsResponse(
        { 
          success: false,
          error: 'Step não encontrado' 
        },
        { status: 404, origin }
      );
    }

    return corsResponse(
      {
        success: true,
        step: stepAtualizado,
        message: 'Step atualizado com sucesso!'
      },
      { origin }
    );

  } catch (error) {
    console.error('[API] Erro ao atualizar step:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao atualizar step',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const fluxoId = url.searchParams.get('fluxoId');

    if (!id && !fluxoId) {
      return corsResponse(
        { 
          success: false,
          error: 'ID ou fluxoId é obrigatório' 
        },
        { status: 400, origin }
      );
    }

    if (fluxoId) {
      // Delete all steps from a specific flow
      await db.delete(steps).where(eq(steps.fluxoId, parseInt(fluxoId)));

      return corsResponse(
        {
          success: true,
          message: 'Todos os steps do fluxo foram deletados!'
        },
        { origin }
      );
    } else if (id) {
      // Delete a specific step
      await db.delete(steps).where(eq(steps.id, parseInt(id)));

      return corsResponse(
        {
          success: true,
          message: 'Step deletado com sucesso!'
        },
        { origin }
      );
    }

  } catch (error) {
    console.error('[API] Erro ao deletar step:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao deletar step',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

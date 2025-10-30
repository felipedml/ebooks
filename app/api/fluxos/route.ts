import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fluxos, steps } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    // Check database connection
    if (!db) {
      console.error('[API] Database not initialized');
      return corsResponse(
        { 
          success: false,
          error: 'Erro de configuração do banco de dados',
          details: 'Database connection not available'
        },
        { status: 500, origin }
      );
    }

    console.log('[API /fluxos GET] Executando query...');
    console.log('[API /fluxos GET] Schema fluxos:', Object.keys(fluxos));
    
    // Try raw SQL first to debug
    let todosFluxos;
    try {
      console.log('[API /fluxos GET] Tentando query Drizzle...');
      todosFluxos = await db.select().from(fluxos).orderBy(desc(fluxos.createdAt));
    } catch (drizzleError) {
      console.error('[API /fluxos GET] ❌ Drizzle query falhou, tentando SQL raw...');
      console.error('[API /fluxos GET] Drizzle error:', drizzleError);
      
      // Fallback to raw SQL
      const rawResult = await db.run(sql`
        SELECT id, nome, descricao, ativo, created_at, updated_at 
        FROM fluxos 
        ORDER BY created_at DESC
      `);
      
      console.log('[API /fluxos GET] Raw SQL result:', rawResult);
      todosFluxos = rawResult.rows || [];
    }
    
    console.log('[API /fluxos GET] Query executada com sucesso');
    console.log('[API /fluxos GET] Total de fluxos encontrados:', todosFluxos.length);

    return corsResponse(
      { 
        success: true, 
        fluxos: todosFluxos 
      },
      { origin }
    );
  } catch (error) {
    console.error('[API] Erro ao buscar fluxos:', error);
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('[API] Error name:', error.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao buscar fluxos',
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
    const { nome, descricao, ativo } = body;
    
    if (!nome) {
      return corsResponse(
        { 
          success: false,
          error: 'Nome é obrigatório' 
        },
        { status: 400, origin }
      );
    }

    const [novoFluxo] = await db.insert(fluxos).values({
      nome,
      descricao: descricao || '',
      ativo: ativo ?? true,
    }).returning();

    return corsResponse(
      { 
        success: true, 
        fluxo: novoFluxo,
        message: 'Fluxo criado com sucesso!' 
      },
      { origin }
    );

  } catch (error) {
    console.error('[API /fluxos GET] ❌ ERRO DETALHADO:', error);
    console.error('[API /fluxos GET] Error type:', typeof error);
    console.error('[API /fluxos GET] Error name:', error instanceof Error ? error.name : 'unknown');
    console.error('[API /fluxos GET] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API /fluxos GET] Error stack:', error instanceof Error ? error.stack : 'no stack');
    
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao buscar fluxos',
        details: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
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
    const { id, nome, descricao, ativo } = body;
    
    if (!id) {
      return corsResponse(
        { 
          success: false,
          error: 'ID é obrigatório' 
        },
        { status: 400, origin }
      );
    }

    const [fluxoAtualizado] = await db.update(fluxos)
      .set({
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(ativo !== undefined && { ativo }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(fluxos.id, id))
      .returning();

    if (!fluxoAtualizado) {
      return corsResponse(
        { 
          success: false,
          error: 'Fluxo não encontrado' 
        },
        { status: 404, origin }
      );
    }

    return corsResponse(
      { 
        success: true, 
        fluxo: fluxoAtualizado,
        message: 'Fluxo atualizado com sucesso!' 
      },
      { origin }
    );

  } catch (error) {
    console.error('[API] Erro ao atualizar fluxo:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao atualizar fluxo',
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return corsResponse(
        { 
          success: false,
          error: 'ID é obrigatório' 
        },
        { status: 400, origin }
      );
    }

    // Deletar steps associados primeiro
    await db.delete(steps).where(eq(steps.fluxoId, parseInt(id)));

    // Deletar fluxo
    const resultado = await db.delete(fluxos)
      .where(eq(fluxos.id, parseInt(id)))
      .returning();

    if (resultado.length === 0) {
      return corsResponse(
        { 
          success: false,
          error: 'Fluxo não encontrado' 
        },
        { status: 404, origin }
      );
    }

    return corsResponse(
      { 
        success: true,
        message: 'Fluxo deletado com sucesso!' 
      },
      { origin }
    );

  } catch (error) {
    console.error('[API] Erro ao deletar fluxo:', error);
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao deletar fluxo',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

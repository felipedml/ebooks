import { NextRequest } from 'next/server';
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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[API /fluxos GET] ${requestId} - Iniciando requisição`);
  console.log(`[API /fluxos GET] ${requestId} - Origin: ${origin}`);
  console.log(`[API /fluxos GET] ${requestId} - URL: ${request.url}`);
  
  try {
    // Check database connection
    if (!db) {
      const errorMsg = 'Database not initialized';
      console.error(`[API /fluxos GET] ${requestId} - ❌ ${errorMsg}`);
      return corsResponse(
        { 
          success: false,
          error: 'Erro de configuração do banco de dados',
          details: errorMsg,
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 500, origin }
      );
    }

    console.log(`[API /fluxos GET] ${requestId} - Database OK`);
    console.log(`[API /fluxos GET] ${requestId} - Schema fluxos columns:`, Object.keys(fluxos));
    
    // Check for specific ID query
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      console.log(`[API /fluxos GET] ${requestId} - Buscando fluxo específico ID: ${id}`);
      const fluxoId = parseInt(id);
      
      if (isNaN(fluxoId)) {
        console.error(`[API /fluxos GET] ${requestId} - ❌ ID inválido: ${id}`);
        return corsResponse(
          { 
            success: false,
            error: 'ID inválido',
            details: `O ID '${id}' não é um número válido`,
            requestId,
            timestamp: new Date().toISOString()
          },
          { status: 400, origin }
        );
      }
      
      const [fluxo] = await db.select().from(fluxos).where(eq(fluxos.id, fluxoId));
      
      if (!fluxo) {
        console.log(`[API /fluxos GET] ${requestId} - ⚠️ Fluxo não encontrado: ${id}`);
        return corsResponse(
          { 
            success: false,
            error: 'Fluxo não encontrado',
            details: `Nenhum fluxo encontrado com ID ${id}`,
            requestId,
            timestamp: new Date().toISOString()
          },
          { status: 404, origin }
        );
      }
      
      console.log(`[API /fluxos GET] ${requestId} - ✅ Fluxo encontrado: ${fluxo.nome}`);
      return corsResponse(
        { 
          success: true, 
          fluxo,
          requestId,
          timestamp: new Date().toISOString()
        },
        { origin }
      );
    }
    
    // Get all flows
    let todosFluxos: typeof fluxos.$inferSelect[];
    try {
      console.log(`[API /fluxos GET] ${requestId} - Executando query Drizzle...`);
      const startTime = Date.now();
      todosFluxos = await db.select().from(fluxos).orderBy(desc(fluxos.createdAt));
      const queryTime = Date.now() - startTime;
      console.log(`[API /fluxos GET] ${requestId} - ✅ Query executada em ${queryTime}ms`);
    } catch (drizzleError) {
      console.error(`[API /fluxos GET] ${requestId} - ❌ Drizzle query falhou:`, drizzleError);
      console.error(`[API /fluxos GET] ${requestId} - Tentando fallback SQL raw...`);
      
      // Fallback to raw SQL - use all() for SELECT queries
      todosFluxos = await db.all(sql`
        SELECT id, nome, descricao, ativo, created_at as createdAt, updated_at as updatedAt
        FROM fluxos 
        ORDER BY created_at DESC
      `) as typeof fluxos.$inferSelect[];
      
      console.log(`[API /fluxos GET] ${requestId} - ✅ Raw SQL executado com ${todosFluxos.length} resultados`);
    }
    
    console.log(`[API /fluxos GET] ${requestId} - ✅ Total de fluxos encontrados: ${todosFluxos.length}`);
    
    if (todosFluxos.length > 0) {
      console.log(`[API /fluxos GET] ${requestId} - Primeiro fluxo:`, todosFluxos[0].nome);
      console.log(`[API /fluxos GET] ${requestId} - Último fluxo:`, todosFluxos[todosFluxos.length - 1].nome);
    }

    return corsResponse(
      { 
        success: true, 
        fluxos: todosFluxos,
        count: todosFluxos.length,
        requestId,
        timestamp: new Date().toISOString()
      },
      { origin }
    );
  } catch (error) {
    console.error(`[API /fluxos GET] ${requestId} - ❌ ERRO CRÍTICO:`, error);
    
    // Log more details for debugging
    const errorDetails: {
      message: string;
      type: string;
      stack?: string;
      keys?: string[];
    } = {
      message: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : typeof error,
    };
    
    if (error instanceof Error) {
      console.error(`[API /fluxos GET] ${requestId} - Error name:`, error.name);
      console.error(`[API /fluxos GET] ${requestId} - Error message:`, error.message);
      console.error(`[API /fluxos GET] ${requestId} - Error stack:`, error.stack);
      errorDetails.stack = error.stack;
    }
    
    // Try to get more info from error object
    if (typeof error === 'object' && error !== null) {
      errorDetails.keys = Object.keys(error);
      console.error(`[API /fluxos GET] ${requestId} - Error keys:`, Object.keys(error));
    }
    
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao buscar fluxos',
        details: errorDetails.message,
        errorType: errorDetails.type,
        stack: process.env.NODE_ENV === 'development' ? errorDetails.stack : undefined,
        requestId,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { errorKeys: errorDetails.keys })
      },
      { status: 500, origin }
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[API /fluxos POST] ${requestId} - Iniciando criação de fluxo`);
  console.log(`[API /fluxos POST] ${requestId} - Origin: ${origin}`);
  
  try {
    const body = await request.json();
    const { nome, descricao, ativo } = body;
    
    console.log(`[API /fluxos POST] ${requestId} - Body recebido:`, { nome, descricao, ativo });
    
    if (!nome) {
      console.warn(`[API /fluxos POST] ${requestId} - ⚠️ Validação falhou: Nome obrigatório`);
      return corsResponse(
        { 
          success: false,
          error: 'Nome é obrigatório',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 400, origin }
      );
    }

    console.log(`[API /fluxos POST] ${requestId} - Inserindo fluxo no banco...`);
    const startTime = Date.now();
    
    const [novoFluxo] = await db.insert(fluxos).values({
      nome,
      descricao: descricao || '',
      ativo: ativo ?? true,
    }).returning();
    
    const insertTime = Date.now() - startTime;
    console.log(`[API /fluxos POST] ${requestId} - ✅ Fluxo criado em ${insertTime}ms - ID: ${novoFluxo.id}`);

    return corsResponse(
      { 
        success: true, 
        fluxo: novoFluxo,
        message: 'Fluxo criado com sucesso!',
        requestId,
        timestamp: new Date().toISOString()
      },
      { origin }
    );

  } catch (error) {
    console.error(`[API /fluxos POST] ${requestId} - ❌ ERRO CRÍTICO:`, error);
    console.error(`[API /fluxos POST] ${requestId} - Error type:`, typeof error);
    console.error(`[API /fluxos POST] ${requestId} - Error name:`, error instanceof Error ? error.name : 'unknown');
    console.error(`[API /fluxos POST] ${requestId} - Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[API /fluxos POST] ${requestId} - Error stack:`, error instanceof Error ? error.stack : 'no stack');
    
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao criar fluxo',
        details: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500, origin }
    );
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[API /fluxos PUT] ${requestId} - Iniciando atualização de fluxo`);
  console.log(`[API /fluxos PUT] ${requestId} - Origin: ${origin}`);
  
  try {
    const body = await request.json();
    const { id, nome, descricao, ativo } = body;
    
    console.log(`[API /fluxos PUT] ${requestId} - Body recebido:`, { id, nome, descricao, ativo });
    
    if (!id) {
      console.warn(`[API /fluxos PUT] ${requestId} - ⚠️ Validação falhou: ID obrigatório`);
      return corsResponse(
        { 
          success: false,
          error: 'ID é obrigatório',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 400, origin }
      );
    }

    console.log(`[API /fluxos PUT] ${requestId} - Atualizando fluxo ID: ${id}`);
    const startTime = Date.now();
    
    const [fluxoAtualizado] = await db.update(fluxos)
      .set({
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(ativo !== undefined && { ativo }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(fluxos.id, id))
      .returning();
    
    const updateTime = Date.now() - startTime;

    if (!fluxoAtualizado) {
      console.log(`[API /fluxos PUT] ${requestId} - ⚠️ Fluxo não encontrado: ${id}`);
      return corsResponse(
        { 
          success: false,
          error: 'Fluxo não encontrado',
          details: `Nenhum fluxo encontrado com ID ${id}`,
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 404, origin }
      );
    }
    
    console.log(`[API /fluxos PUT] ${requestId} - ✅ Fluxo atualizado em ${updateTime}ms`);

    return corsResponse(
      { 
        success: true, 
        fluxo: fluxoAtualizado,
        message: 'Fluxo atualizado com sucesso!',
        requestId,
        timestamp: new Date().toISOString()
      },
      { origin }
    );

  } catch (error) {
    console.error(`[API /fluxos PUT] ${requestId} - ❌ ERRO CRÍTICO:`, error);
    console.error(`[API /fluxos PUT] ${requestId} - Error type:`, typeof error);
    console.error(`[API /fluxos PUT] ${requestId} - Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[API /fluxos PUT] ${requestId} - Error stack:`, error instanceof Error ? error.stack : 'no stack');
    
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao atualizar fluxo',
        details: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500, origin }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[API /fluxos DELETE] ${requestId} - Iniciando deleção de fluxo`);
  console.log(`[API /fluxos DELETE] ${requestId} - Origin: ${origin}`);
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log(`[API /fluxos DELETE] ${requestId} - ID recebido: ${id}`);

    if (!id) {
      console.warn(`[API /fluxos DELETE] ${requestId} - ⚠️ Validação falhou: ID obrigatório`);
      return corsResponse(
        { 
          success: false,
          error: 'ID é obrigatório',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 400, origin }
      );
    }
    
    const fluxoId = parseInt(id);
    if (isNaN(fluxoId)) {
      console.error(`[API /fluxos DELETE] ${requestId} - ❌ ID inválido: ${id}`);
      return corsResponse(
        { 
          success: false,
          error: 'ID inválido',
          details: `O ID '${id}' não é um número válido`,
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 400, origin }
      );
    }

    console.log(`[API /fluxos DELETE] ${requestId} - Deletando steps associados ao fluxo ${fluxoId}...`);
    const startTime = Date.now();
    
    // Deletar steps associados primeiro
    const stepsDeleted = await db.delete(steps).where(eq(steps.fluxoId, fluxoId));
    console.log(`[API /fluxos DELETE] ${requestId} - Steps deletados`);

    // Deletar fluxo
    console.log(`[API /fluxos DELETE] ${requestId} - Deletando fluxo ${fluxoId}...`);
    const resultado = await db.delete(fluxos)
      .where(eq(fluxos.id, fluxoId))
      .returning();
    
    const deleteTime = Date.now() - startTime;

    if (resultado.length === 0) {
      console.log(`[API /fluxos DELETE] ${requestId} - ⚠️ Fluxo não encontrado: ${id}`);
      return corsResponse(
        { 
          success: false,
          error: 'Fluxo não encontrado',
          details: `Nenhum fluxo encontrado com ID ${id}`,
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 404, origin }
      );
    }
    
    console.log(`[API /fluxos DELETE] ${requestId} - ✅ Fluxo deletado em ${deleteTime}ms`);

    return corsResponse(
      { 
        success: true,
        message: 'Fluxo deletado com sucesso!',
        deletedFluxo: resultado[0],
        requestId,
        timestamp: new Date().toISOString()
      },
      { origin }
    );

  } catch (error) {
    console.error(`[API /fluxos DELETE] ${requestId} - ❌ ERRO CRÍTICO:`, error);
    console.error(`[API /fluxos DELETE] ${requestId} - Error type:`, typeof error);
    console.error(`[API /fluxos DELETE] ${requestId} - Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[API /fluxos DELETE] ${requestId} - Error stack:`, error instanceof Error ? error.stack : 'no stack');
    
    return corsResponse(
      { 
        success: false,
        error: 'Erro interno do servidor ao deletar fluxo',
        details: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500, origin }
    );
  }
}

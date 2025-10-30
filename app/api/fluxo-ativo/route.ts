import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fluxos } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    console.log('Buscando fluxo ativo...');
    
    // Verificar se a tabela existe fazendo uma consulta mais simples
    const todosFluxos = await db.select().from(fluxos).limit(5);
    console.log('Todos os fluxos encontrados:', todosFluxos.length);

    // Pegar o fluxo ativo mais recente
    const ativoMaisRecente = await db.select()
      .from(fluxos)
      .where(eq(fluxos.ativo, true))
      .orderBy(desc(fluxos.createdAt))
      .limit(1);

    console.log('Fluxos ativos encontrados:', ativoMaisRecente.length);

    if (ativoMaisRecente.length === 0) {
      return corsResponse(
        {
          success: false,
          message: 'Nenhum fluxo ativo encontrado',
          totalFluxos: todosFluxos.length
        },
        { origin }
      );
    }

    console.log('Fluxo ativo encontrado:', ativoMaisRecente[0].nome);
    return corsResponse(
      { success: true, fluxo: ativoMaisRecente[0] },
      { origin }
    );
  } catch (error) {
    console.error('[API] Erro detalhado ao buscar fluxo ativo:', error);
    return corsResponse(
      {
        success: false,
        error: 'Erro ao conectar com o banco de dados',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500, origin }
    );
  }
}

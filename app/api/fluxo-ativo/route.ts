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
  console.log('[API /fluxo-ativo] 🔍 Iniciando busca de fluxo ativo...');
  console.log('[API /fluxo-ativo] DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado');
  console.log('[API /fluxo-ativo] Environment:', process.env.NODE_ENV);
  
  try {
    console.log('[API /fluxo-ativo] Verificando tabela fluxos...');
    
    // Verificar se a tabela existe fazendo uma consulta mais simples
    console.log('[API /fluxo-ativo] Executando SELECT * FROM fluxos LIMIT 5...');
    const todosFluxos = await db.select().from(fluxos).limit(5);
    console.log('[API /fluxo-ativo] ✅ Todos os fluxos encontrados:', todosFluxos.length);
    console.log('[API /fluxo-ativo] Fluxos:', JSON.stringify(todosFluxos, null, 2));

    // Pegar o fluxo ativo mais recente
    console.log('[API /fluxo-ativo] Buscando fluxos com ativo=true...');
    const ativoMaisRecente = await db.select()
      .from(fluxos)
      .where(eq(fluxos.ativo, true))
      .orderBy(desc(fluxos.createdAt))
      .limit(1);

    console.log('[API /fluxo-ativo] Fluxos ativos encontrados:', ativoMaisRecente.length);
    if (ativoMaisRecente.length > 0) {
      console.log('[API /fluxo-ativo] Fluxo ativo:', JSON.stringify(ativoMaisRecente[0], null, 2));
    }

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

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fluxos } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
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
      return NextResponse.json({
        success: false,
        message: 'Nenhum fluxo ativo encontrado',
        totalFluxos: todosFluxos.length
      });
    }

    console.log('Fluxo ativo encontrado:', ativoMaisRecente[0].nome);
    return NextResponse.json({ success: true, fluxo: ativoMaisRecente[0] });
  } catch (error) {
    console.error('Erro detalhado ao buscar fluxo ativo:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao conectar com o banco de dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

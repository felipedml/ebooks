import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fluxos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const [fluxo] = await db.select()
      .from(fluxos)
      .where(eq(fluxos.id, id))
      .limit(1);

    if (!fluxo) {
      return NextResponse.json(
        { success: false, error: 'Fluxo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, fluxo });
  } catch (error) {
    console.error('Erro ao buscar fluxo:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

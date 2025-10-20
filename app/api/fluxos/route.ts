import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fluxos, steps } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const todosFluxos = await db.select().from(fluxos).orderBy(desc(fluxos.createdAt));

    return NextResponse.json({ 
      success: true, 
      fluxos: todosFluxos 
    });
  } catch (error) {
    console.error('Erro ao buscar fluxos:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao buscar fluxos',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, descricao, ativo } = body;
    
    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    const [novoFluxo] = await db.insert(fluxos).values({
      nome,
      descricao: descricao || '',
      ativo: ativo ?? true,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      fluxo: novoFluxo,
      message: 'Fluxo criado com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao criar fluxo:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao criar fluxo',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome, descricao, ativo } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
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
      return NextResponse.json(
        { error: 'Fluxo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      fluxo: fluxoAtualizado,
      message: 'Fluxo atualizado com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao atualizar fluxo:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao atualizar fluxo',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    // Deletar steps primeiro (CASCADE deveria fazer isso automaticamente, mas vamos garantir)
    await db.delete(steps).where(eq(steps.fluxoId, parseInt(id)));
    
    // Deletar fluxo
    const resultado = await db.delete(fluxos).where(eq(fluxos.id, parseInt(id)));

    return NextResponse.json({ 
      success: true,
      message: 'Fluxo deletado com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao deletar fluxo:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao deletar fluxo',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

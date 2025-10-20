import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { livros } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { nome, titulo, subtitulo, resumo, idioma, autor, email, whatsapp } = body;
    
    // Validação básica
    if (!nome || !titulo || !resumo || !idioma || !autor || !email) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    // Inserir no banco de dados
    const [novoLivro] = await db.insert(livros).values({
      nome,
      titulo,
      subtitulo: subtitulo || '',
      resumo,
      idioma,
      autor,
      email,
      whatsapp: whatsapp || '',
      status: 'pendente',
      valor: 49.90,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      livro: novoLivro,
      message: 'Livro salvo com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao salvar livro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

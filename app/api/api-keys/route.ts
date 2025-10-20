import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt, maskApiKey, validateApiKeyFormat } from '@/lib/crypto-utils';

// GET - Listar todas as API keys (sem mostrar as keys reais)
export async function GET() {
  try {
    const keys = await db.select().from(apiKeys);
    
    // Mascarar as keys antes de enviar
    const maskedKeys = keys.map(key => ({
      ...key,
      keyEncriptada: maskApiKey(decrypt(key.keyEncriptada)), // Decripta e mascara para exibição
      keyMasked: maskApiKey(decrypt(key.keyEncriptada)),
    }));
    
    return NextResponse.json({
      success: true,
      keys: maskedKeys,
    });
  } catch (error) {
    console.error('Erro ao listar API keys:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar API keys' },
      { status: 500 }
    );
  }
}

// POST - Criar nova API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, provider, apiKey } = body;
    
    // Validações
    if (!nome || !provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Nome, provider e API key são obrigatórios' },
        { status: 400 }
      );
    }
    
    if (provider !== 'openai' && provider !== 'gemini') {
      return NextResponse.json(
        { success: false, error: 'Provider deve ser "openai" ou "gemini"' },
        { status: 400 }
      );
    }
    
    // Validar formato da API key
    if (!validateApiKeyFormat(provider, apiKey)) {
      return NextResponse.json(
        { success: false, error: `Formato de API key inválido para ${provider}` },
        { status: 400 }
      );
    }
    
    // Encriptar a API key
    const keyEncriptada = encrypt(apiKey);
    
    // Salvar no banco
    const [novaKey] = await db.insert(apiKeys).values({
      nome,
      provider,
      keyEncriptada,
      ativa: true,
    }).returning();
    
    return NextResponse.json({
      success: true,
      key: {
        ...novaKey,
        keyMasked: maskApiKey(apiKey),
      },
      message: 'API key adicionada com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao criar API key:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar API key' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar API key (nome ou status ativo)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome, ativa } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      );
    }
    
    const [keyAtualizada] = await db.update(apiKeys)
      .set({
        ...(nome !== undefined && { nome }),
        ...(ativa !== undefined && { ativa }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(apiKeys.id, id))
      .returning();
    
    if (!keyAtualizada) {
      return NextResponse.json(
        { success: false, error: 'API key não encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      key: {
        ...keyAtualizada,
        keyMasked: maskApiKey(decrypt(keyAtualizada.keyEncriptada)),
      },
      message: 'API key atualizada com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao atualizar API key:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar API key' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      );
    }
    
    await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(id)));
    
    return NextResponse.json({
      success: true,
      message: 'API key deletada com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao deletar API key:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao deletar API key' },
      { status: 500 }
    );
  }
}

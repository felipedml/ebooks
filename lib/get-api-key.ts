import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto-utils';

/**
 * Recupera API key decriptada do banco (USO INTERNO DO BACKEND APENAS!)
 * Nunca exponha isso para o frontend
 */
export async function getApiKey(apiKeyId: number): Promise<string | null> {
  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.id, apiKeyId),
        eq(apiKeys.ativa, true)
      ))
      .limit(1);
    
    if (!key) {
      console.error(`API Key ID ${apiKeyId} not found or inactive`);
      return null;
    }
    
    return decrypt(key.keyEncriptada);
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Recupera API key por provider (pega a primeira ativa)
 * Fallback para variável de ambiente se não houver no banco
 */
export async function getApiKeyByProvider(provider: 'openai' | 'gemini'): Promise<string | null> {
  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.provider, provider),
        eq(apiKeys.ativa, true)
      ))
      .limit(1);
    
    if (key) {
      return decrypt(key.keyEncriptada);
    }
    
    // Fallback para variável de ambiente
    if (provider === 'openai') {
      return process.env.OPENAI_API_KEY || null;
    } else if (provider === 'gemini') {
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting API key by provider:', error);
    // Fallback para env vars em caso de erro
    if (provider === 'openai') {
      return process.env.OPENAI_API_KEY || null;
    } else if (provider === 'gemini') {
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
    }
    return null;
  }
}

import crypto from 'crypto';

// Chave de encriptação derivada de variável de ambiente
// Em produção, use uma chave forte e segura
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'; // Deve ter 32 bytes
const ALGORITHM = 'aes-256-cbc';

// Garante que a chave tem 32 bytes
function getKey(): Buffer {
  const key = ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32);
  return Buffer.from(key, 'utf-8');
}

/**
 * Encripta uma string (API key)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16); // Initialization vector
  const key = getKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Retorna IV + encrypted concatenados
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decripta uma string encriptada
 */
export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = getKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting:', error);
    throw new Error('Failed to decrypt API key');
  }
}

/**
 * Mascara uma API key para exibição (mostra apenas primeiros/últimos caracteres)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '***';
  }
  
  const start = apiKey.slice(0, 8);
  const end = apiKey.slice(-4);
  return `${start}...${end}`;
}

/**
 * Valida formato básico de API key
 */
export function validateApiKeyFormat(provider: 'openai' | 'gemini', apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }
  
  if (provider === 'openai') {
    // OpenAI keys começam com 'sk-'
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  } else if (provider === 'gemini') {
    // Google API keys tem formato específico
    return apiKey.length > 20; // Validação básica
  }
  
  return false;
}

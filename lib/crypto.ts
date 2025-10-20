/**
 * Encryption utilities for sensitive data (OAuth tokens, etc.)
 * Uses AES-256-CBC for simple, reliable encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment
 * In production, use a secure key management service
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-min32chars';
  
  // Create a consistent 32-byte key
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a string value
 * @param text - Plain text to encrypt
 * @returns Encrypted string in base64 format
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  // Combine iv + encrypted
  const result = Buffer.concat([iv, encrypted]);
  
  return result.toString('base64');
}

/**
 * Decrypt an encrypted string
 * @param encryptedText - Encrypted text in base64 format
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedText, 'base64');
  
  // Extract IV and encrypted data
  const iv = data.subarray(0, IV_LENGTH);
  const encrypted = data.subarray(IV_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Hash a value (one-way, for comparison only)
 * @param text - Text to hash
 * @returns SHA-256 hash in hex format
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a random token
 * @param length - Length in bytes (default 32)
 * @returns Random token in hex format
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

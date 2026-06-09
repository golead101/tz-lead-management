const crypto = require('crypto');

// Retrieve key from environment variable, or fallback to a developer default key for local workspace tests
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'tz_lead_crm_google_ads_key_2026_default';
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest(); // Always generates exactly 32 bytes (256 bits)
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size in bytes

/**
 * Encrypt a text string using AES-256-CBC.
 * Returns the encrypted string formatted as 'iv_hex:ciphertext_hex'.
 */
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string formatted as 'iv_hex:ciphertext_hex'.
 * Returns the original decrypted text.
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    // Fallback if the text was somehow stored in plain text or invalid format
    return encryptedText;
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};

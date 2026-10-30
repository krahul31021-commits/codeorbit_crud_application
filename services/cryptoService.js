const crypto = require('crypto');

// Master Vault Key (in production, set via process.env.VAULT_MASTER_KEY)
const MASTER_SECRET = process.env.VAULT_MASTER_KEY || 'codeorbit_e2e_vault_super_key_32bytes_sec!';

// Derive a fixed 32-byte (256-bit) key using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt a file buffer with AES-256-CBC and unique IV
 * @param {Buffer} buffer
 * @returns {{ encryptedBuffer: Buffer, iv: string }}
 */
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return {
    encryptedBuffer: encrypted,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt an encrypted buffer back to original data
 * @param {Buffer} encryptedBuffer
 * @param {string} ivHex
 * @returns {Buffer}
 */
function decryptBuffer(encryptedBuffer, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted;
}

module.exports = {
  encryptBuffer,
  decryptBuffer,
};

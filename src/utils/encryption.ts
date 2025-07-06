import * as crypto from 'crypto';


const ENCRYPTION_KEY = process.env.DATABASE_ENCRYPTION_KEY || 'default-encryption-key-32-chars-long';
const ALGORITHM = 'aes-256-cbc';

export const encryptField = (text: string): string => {
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

export const decryptField = (encryptedText: string): string => {
  const textParts = encryptedText.split(':');
  const encryptedData = textParts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};


export const encryptData = encryptField;
export const decryptData = decryptField; 
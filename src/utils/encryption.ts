import { SecurityConfig } from '../config/security';

export const encryptField = (text: string): string => {
  return SecurityConfig.database.encryptField(text);
};

export const decryptField = (encryptedText: string): string => {
  return SecurityConfig.database.decryptField(encryptedText);
}; 
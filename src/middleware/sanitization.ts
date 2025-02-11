import { sanitize } from 'isomorphic-dompurify';

export const sanitizeInput = (obj: any): any => {
  if (typeof obj !== 'object') return obj;
  
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    if (typeof value === 'string') {
      acc[key] = sanitize(value);
    } else if (typeof value === 'object') {
      acc[key] = sanitizeInput(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
}; 
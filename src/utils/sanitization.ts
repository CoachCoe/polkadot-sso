export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const sanitizeInput = (obj: any): any => {
  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? escapeHtml(obj) : obj;
  }
  
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = typeof obj[key] === 'object' 
      ? sanitizeInput(obj[key])
      : typeof obj[key] === 'string' 
        ? escapeHtml(obj[key]) 
        : obj[key];
    return acc;
  }, {} as any);
}; 
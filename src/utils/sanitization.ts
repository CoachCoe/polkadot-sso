export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const sanitizeInput = (obj: unknown): unknown => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? escapeHtml(obj) : obj;
  }
  
  return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
    const value = (obj as Record<string, unknown>)[key];
    acc[key] = typeof value === 'object' && value !== null
      ? sanitizeInput(value)
      : typeof value === 'string'
        ? escapeHtml(value)
        : value;
    return acc;
  }, {} as Record<string, unknown>);
}; 
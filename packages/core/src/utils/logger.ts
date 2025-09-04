export interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export function createLogger(service: string): Logger {
  return {
    info: (message: string, meta?: any) => {
      console.log(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error: (message: string, meta?: any) => {
      console.error(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message: string, meta?: any) => {
      console.debug(`[${service}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}

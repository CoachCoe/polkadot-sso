import { Request } from 'express';
import * as winston from 'winston';
export declare const createLogger: (service: string) => winston.Logger;
export declare const logRequest: (req: Request, message: string, meta?: Record<string, unknown>) => void;
export declare const logError: (req: Request, error: Error, meta?: Record<string, unknown>) => void;
//# sourceMappingURL=logger.d.ts.map
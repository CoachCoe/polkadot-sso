export interface Logger {
    info: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}
export declare function createLogger(service: string): Logger;
//# sourceMappingURL=logger.d.ts.map
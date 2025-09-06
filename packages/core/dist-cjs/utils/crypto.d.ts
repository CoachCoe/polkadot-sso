export interface CryptoUtils {
    randomBytes: (size: number) => Uint8Array;
    createHash: (algorithm: string) => {
        update: (data: string | Uint8Array) => any;
        digest: (encoding?: string) => string;
    };
    randomUUID: () => string;
    createHmac: (algorithm: string, key: string | Uint8Array) => {
        update: (data: string | Uint8Array) => any;
        digest: (encoding?: string) => string;
    };
}
export declare const cryptoUtils: CryptoUtils;
export declare const randomBytes: (size: number) => Uint8Array<ArrayBufferLike>;
export declare const createHash: (algorithm: string) => {
    update: (data: string | Uint8Array) => any;
    digest: (encoding?: string) => string;
};
export declare const randomUUID: () => string;
export declare const createHmac: (algorithm: string, key: string | Uint8Array) => {
    update: (data: string | Uint8Array) => any;
    digest: (encoding?: string) => string;
};
//# sourceMappingURL=crypto.d.ts.map
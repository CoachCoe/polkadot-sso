import { AuthResult, Challenge, SIWEMessage, SIWESignature } from '../types';
export declare class SIWEAuthService {
    private defaultChain;
    constructor(defaultChainId?: string);
    generateSIWEMessage(params: {
        domain: string;
        address: string;
        statement?: string;
        uri: string;
        version?: string;
        chainId: string;
        nonce: string;
        issuedAt: string;
        expirationTime?: string;
        notBefore?: string;
        requestId?: string;
        resources?: string[];
    }): string;
    parseSIWEMessage(message: string): SIWEMessage | null;
    validateSIWEMessage(message: string): boolean;
    isValidPolkadotAddress(address: string): boolean;
    generateNonce(): string;
    verifySIWESignature(signature: SIWESignature, challenge: Challenge): Promise<AuthResult>;
    createChallenge(clientId: string, userAddress?: string, chainId?: string): Challenge;
}
//# sourceMappingURL=siwe.d.ts.map
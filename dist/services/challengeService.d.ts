import { Database } from 'sqlite';
import { Challenge } from '../types/auth';
export declare class ChallengeService {
    private db;
    constructor(db: Database);
    private generateCodeVerifier;
    private generateCodeChallenge;
    private generateNonce;
    private formatSIWEStyleMessage;
    generateChallenge(client_id: string, userAddress?: string): Promise<Challenge>;
    storeChallenge(challenge: Challenge): Promise<void>;
    getChallenge(id: string): Promise<Challenge | undefined>;
    getChallengeByNonce(nonce: string): Promise<Challenge | undefined>;
    markChallengeUsed(id: string): Promise<void>;
    cleanupExpiredChallenges(): Promise<void>;
    validateMessageFormat(message: string): boolean;
    extractAddressFromMessage(message: string): string | null;
    extractNonceFromMessage(message: string): string | null;
}
//# sourceMappingURL=challengeService.d.ts.map
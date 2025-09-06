import { Challenge } from '../types/auth';
export declare class ChallengeService {
    constructor();
    private generateCodeVerifier;
    private generateCodeChallenge;
    private generateNonce;
    private formatSIWEStyleMessage;
    generateChallenge(client_id: string, userAddress?: string): Promise<Challenge>;
    getChallenge(challengeId: string): Promise<Challenge | null>;
    markChallengeUsed(challengeId: string): Promise<boolean>;
    cleanupExpiredChallenges(): Promise<number>;
    getChallengeStats(): Promise<{
        active: number;
        expired: number;
        used: number;
    }>;
}
//# sourceMappingURL=challengeService.d.ts.map
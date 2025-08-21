import { Challenge } from '../types/auth';
import { Database } from 'sqlite';
export declare class ChallengeService {
    private db;
    constructor(db: Database);
    private generateCodeVerifier;
    private generateCodeChallenge;
    generateChallenge(client_id: string): Promise<Challenge>;
    storeChallenge(challenge: Challenge): Promise<void>;
    getChallenge(id: string): Promise<Challenge | undefined>;
    markChallengeUsed(id: string): Promise<void>;
    cleanupExpiredChallenges(): Promise<void>;
}
//# sourceMappingURL=challengeService.d.ts.map
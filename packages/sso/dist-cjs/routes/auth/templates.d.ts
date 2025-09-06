export interface ChallengeTemplateData {
    address?: string;
    message: string;
    challengeId: string;
    codeVerifier: string;
    state: string;
    nonce: string;
}
export declare function generateChallengePage(data: ChallengeTemplateData, nonce: string): string;
export declare function generateApiDocsPage(): string;
//# sourceMappingURL=templates.d.ts.map
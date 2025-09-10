import React from 'react';
interface TelegramAuthButtonProps {
    onAuthStart?: (challengeId: string) => void;
    onAuthSuccess?: (address: string, session: any) => void;
    onAuthError?: (error: string) => void;
    className?: string;
    disabled?: boolean;
    children?: React.ReactNode;
}
export declare const TelegramAuthButton: React.FC<TelegramAuthButtonProps>;
export {};
//# sourceMappingURL=TelegramAuthButton.d.ts.map
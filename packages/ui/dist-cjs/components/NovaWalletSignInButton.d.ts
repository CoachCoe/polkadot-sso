import React from 'react';
interface NovaWalletSignInButtonProps {
    onSuccess: (address: string, session: any) => void;
    onError: (error: Error) => void;
    baseUrl: string;
    className?: string;
    children?: React.ReactNode;
}
export declare function NovaWalletSignInButton({ onSuccess, onError, baseUrl, className, children, }: NovaWalletSignInButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=NovaWalletSignInButton.d.ts.map
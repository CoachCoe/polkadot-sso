import { NovaQrAuthData } from '@polkadot-auth/client-sdk';
interface NovaQrAuthProps {
    qrData: NovaQrAuthData;
    onSuccess: () => void;
    onError: (error: Error) => void;
    onCancel: () => void;
    waitForCompletion: () => Promise<void>;
    className?: string;
}
export declare function NovaQrAuth({ qrData, onSuccess, onError, onCancel, waitForCompletion, className, }: NovaQrAuthProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=NovaQrAuth.d.ts.map
import { TelegramQRData } from '@polkadot-auth/telegram';
import React from 'react';
interface TelegramQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrData: TelegramQRData | null;
    onAuthSuccess?: (address: string, session: any) => void;
    onAuthError?: (error: string) => void;
}
export declare const TelegramQRModal: React.FC<TelegramQRModalProps>;
export {};
//# sourceMappingURL=TelegramQRModal.d.ts.map
import { TransactionLimits } from '@polkadot-auth/core';
import React from 'react';
interface SendMoneyFormProps {
    onSend: (recipient: string, amount: number, targetCurrency: string) => void;
    onGetQuote: (amount: number, targetCurrency: string) => void;
    limits?: TransactionLimits | null;
    custodyLevel: number;
}
export declare const SendMoneyForm: React.FC<SendMoneyFormProps>;
export {};
//# sourceMappingURL=SendMoneyForm.d.ts.map
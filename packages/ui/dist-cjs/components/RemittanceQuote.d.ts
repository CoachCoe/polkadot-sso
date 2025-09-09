import React from 'react';
interface RemittanceQuoteProps {
    quote: {
        amount: number;
        currency: string;
        targetCurrency: string;
        exchangeRate: number;
        recipientAmount: number;
        fees: {
            platform: number;
            network: number;
            exchange: number;
            total: number;
        };
        totalCost: number;
        expiresAt: Date;
    };
    onClose: () => void;
    onConfirm: () => void;
}
export declare const RemittanceQuote: React.FC<RemittanceQuoteProps>;
export {};
//# sourceMappingURL=RemittanceQuote.d.ts.map
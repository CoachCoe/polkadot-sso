import { RemittanceTransaction } from '@polkadot-auth/core';
import React from 'react';
interface RemittanceDashboardProps {
    baseUrl?: string;
    onTransactionCreated?: (transaction: RemittanceTransaction) => void;
    onError?: (error: Error) => void;
}
export declare const RemittanceDashboard: React.FC<RemittanceDashboardProps>;
export {};
//# sourceMappingURL=RemittanceDashboard.d.ts.map
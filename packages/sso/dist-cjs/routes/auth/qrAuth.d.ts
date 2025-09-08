import { Request, Response } from 'express';
/**
 * Generate QR code authentication data
 */
export declare function generateQrAuth(req: Request, res: Response): Promise<void>;
/**
 * Check QR authentication status
 */
export declare function checkQrAuthStatus(req: Request, res: Response): Promise<void>;
/**
 * Handle QR authentication callback from Nova Wallet
 */
export declare function handleQrCallback(req: Request, res: Response): Promise<void>;
/**
 * Get QR authentication result
 */
export declare function getQrAuthResult(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=qrAuth.d.ts.map
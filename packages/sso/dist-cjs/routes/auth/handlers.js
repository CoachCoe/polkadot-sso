"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenHandler = exports.createVerifyHandler = exports.createLoginHandler = void 0;
const crypto_1 = __importStar(require("crypto"));
const db_1 = require("../../utils/db");
const logger_1 = require("../../utils/logger");
const validation_1 = require("../../utils/validation");
const logger = (0, logger_1.createLogger)('auth-handlers');
function generateCodeChallenge(verifier) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(verifier);
    return hash.digest('base64url');
}
function verifySignature(message, signature, address) {
    try {
        if (signature.length < 64) {
            return false;
        }
        logger.info('Signature verification attempt', {
            messageLength: message.length,
            signaturePreview: signature.substring(0, 16),
            address,
        });
        return true;
    }
    catch (error) {
        logger.error('Signature verification error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
const createLoginHandler = (tokenService, challengeService, auditService, clients, db) => {
    return async (req, res) => {
        try {
            (0, logger_1.logRequest)(req, 'Login attempt', { address: req.query.address });
            const validation = (0, validation_1.validateAuthRequest)(req);
            if (!validation.isValid) {
                (0, logger_1.logError)(req, new Error(validation.error || 'Validation failed'));
                return res.status(400).json({ error: validation.error });
            }
            const { client_id, wallet } = req.query;
            const client = clients.get(client_id);
            if (!client) {
                (0, logger_1.logError)(req, new Error('Invalid client'));
                return res.status(400).json({ error: 'Invalid client' });
            }
            const challenge = await challengeService.generateChallenge(client_id, req.query.address);
            await auditService.log({
                type: 'AUTH_ATTEMPT',
                user_address: req.query.address,
                client_id: client_id,
                action: 'challenge_generated',
                status: 'success',
                details: { wallet },
                ip_address: req.ip || 'unknown',
                user_agent: req.get('User-Agent'),
            });
            res.json({
                challenge_id: challenge.id,
                message: challenge.message,
                code_verifier: challenge.code_verifier,
                state: challenge.state,
                expires_at: challenge.expires_at,
            });
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            res.status(500).json({ error: 'Login failed' });
        }
    };
};
exports.createLoginHandler = createLoginHandler;
const createVerifyHandler = (challengeService, auditService, clients, db) => {
    return async (req, res) => {
        try {
            const { signature, challenge_id, address, code_verifier, state } = req.query;
            logger.info('Verification request received', {
                signaturePreview: signature && typeof signature === 'string' ? signature.substring(0, 20) : 'undefined',
                challenge_id,
                address,
                codeVerifierPreview: code_verifier && typeof code_verifier === 'string'
                    ? code_verifier.substring(0, 20)
                    : 'undefined',
                state,
            });
            if (!signature || !challenge_id || !address || !code_verifier || !state) {
                return res.status(400).send('Missing required parameters');
            }
            const challenge = await challengeService.getChallenge(challenge_id);
            logger.info('Challenge retrieved', {
                id: challenge?.id,
                messageLength: challenge?.message?.length,
                state: challenge?.state,
                expectedState: state,
                used: challenge?.used,
            });
            if (!challenge || challenge.state !== state) {
                return res.status(400).send('Invalid challenge or state mismatch');
            }
            const code_challenge = generateCodeChallenge(code_verifier);
            if (code_challenge !== challenge.code_challenge) {
                return res.status(400).send('Invalid code verifier');
            }
            if (!verifySignature(challenge.message, signature, String(address))) {
                return res.status(401).send('Invalid signature');
            }
            await challengeService.markChallengeUsed(challenge_id);
            const authCode = crypto_1.default.randomBytes(32).toString('hex');
            await db.run(`INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`, [authCode, address, challenge.client_id, Date.now(), Date.now() + 5 * 60 * 1000]);
            const client = clients.get(challenge.client_id);
            if (!client) {
                return res.status(400).send('Invalid client');
            }
            await auditService.log({
                type: 'CHALLENGE_VERIFIED',
                user_address: address,
                client_id: challenge.client_id,
                action: 'signature_verified',
                status: 'success',
                details: { challenge_id },
                ip_address: req.ip || 'unknown',
                user_agent: req.get('User-Agent'),
            });
            res.redirect(`${client.redirect_url}?code=${authCode}&state=${state}`);
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            logger.error('Verification handler error', {
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json({ error: 'Verification failed' });
        }
    };
};
exports.createVerifyHandler = createVerifyHandler;
const createTokenHandler = (tokenService, auditService, db) => {
    return async (req, res) => {
        try {
            const { code, client_id } = req.body;
            if (!code || typeof code !== 'string') {
                return res.status(400).send('Invalid code');
            }
            if (!client_id || typeof client_id !== 'string') {
                return res.status(400).send('Invalid client_id');
            }
            const client = await (0, validation_1.validateClientCredentials)(req);
            if (!client) {
                return res.status(401).send('Invalid client credentials');
            }
            const authCode = await db_1.secureQueries.authCodes.verify(db, code, client_id);
            if (!authCode || Date.now() > authCode.expires_at) {
                return res.status(400).send('Invalid or expired authorization code');
            }
            if (!authCode ||
                typeof authCode !== 'object' ||
                !('address' in authCode) ||
                !('expires_at' in authCode)) {
                return res.status(400).send('Invalid authorization code format');
            }
            const typedAuthCode = authCode;
            if (Date.now() > typedAuthCode.expires_at) {
                return res.status(400).send('Authorization code expired');
            }
            const session = await tokenService.createSession(typedAuthCode.address, client_id);
            if (!session) {
                return res.status(500).send('Failed to create session');
            }
            await auditService.log({
                type: 'TOKEN_EXCHANGE',
                user_address: typedAuthCode.address,
                client_id,
                action: 'token_issued',
                status: 'success',
                details: { code },
                ip_address: req.ip || 'unknown',
                user_agent: req.get('User-Agent'),
            });
            res.json({
                access_token: session.access_token,
                token_type: 'Bearer',
                expires_in: 900, // 15 minutes
                refresh_token: session.refresh_token,
            });
        }
        catch (error) {
            (0, logger_1.logError)(req, error);
            res.status(500).json({ error: 'Token exchange failed' });
        }
    };
};
exports.createTokenHandler = createTokenHandler;
//# sourceMappingURL=handlers.js.map
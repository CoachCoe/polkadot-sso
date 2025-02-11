import { Router, Request, Response } from 'express';
import { TokenService } from '../services/token';
import { ChallengeService } from '../services/challengeService';
import { authLimiter } from '../config/auth';
import { Client, Challenge } from '../types/auth';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { validateAuthRequest, validateSignature, validateClientCredentials } from '../utils/validation';
import crypto from 'crypto';
import { Database } from 'sqlite';
import { createHash } from 'crypto';

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(verifier);
  return hash.digest('base64url');
}

export const createAuthRouter = (
 tokenService: TokenService,
 challengeService: ChallengeService & { generateChallenge(client_id: string): Promise<Challenge> },
 clients: Map<string, Client>,
 db: Database
) => {
 const router = Router();

 router.get('/login', authLimiter, async (req: Request, res: Response) => {
   try {
     const validation = validateAuthRequest(req);
     if (!validation.isValid) {
       return res.status(400).send(validation.error);
     }

     const { client_id } = req.query;
     const client = clients.get(client_id as string);
     
     if (!client) {
       return res.status(400).send('Invalid client');
     }
     
     const escapedClientId = JSON.stringify(client_id);
     
     res.send(`
      <html>
        <head>
          <title>Login with Polkadot</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
        </head>
        <body>
          <div class="container">
            <h1>Login with Polkadot</h1>
            <div id="status">Ready to connect...</div>
            <button id="connectButton">
              <span id="buttonText">Connect Wallet</span>
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script>
            window.SSO_CONFIG = {
              clientId: ${escapedClientId},
              appName: ${JSON.stringify("Polkadot SSO Demo")}
            };
          </script>
          <script src="/js/client/login.js"></script>
        </body>
      </html>
    `);
   } catch (error) {
     console.error('Login error:', error);
     res.status(500).send('Authentication failed');
   }
 });

 router.get('/challenge', authLimiter, async (req: Request, res: Response) => {
   try {
     const { address, client_id } = req.query;
     const client = clients.get(client_id as string);
     
     if (!client) {
       return res.status(400).send('Invalid client');
     }

     if (!address) {
       return res.status(400).send('Address is required');
     }

     const challenge = await challengeService.generateChallenge(client_id as string);
     await challengeService.storeChallenge(challenge);
     
     res.send(`
      <html>
        <head>
          <title>Sign Message</title>
          <link rel="stylesheet" href="/styles/main.css">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util@12.6.2/bundle-polkadot-util.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/util-crypto@12.6.2/bundle-polkadot-util-crypto.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.6/bundle-polkadot-extension-dapp.min.js"></script>
        </head>
        <body>
          <div class="container">
            <h2>Sign Message</h2>
            <div class="message-box">
              <p><strong>Message:</strong> ${challenge.message}</p>
              <p><strong>Address:</strong> ${address}</p>
            </div>
            <div id="status"></div>
            <button id="signButton">
              <span id="buttonText">Sign with Wallet</span>
              <span id="loadingSpinner" class="loading" style="display: none;"></span>
            </button>
          </div>
          <script>
            window.CHALLENGE_DATA = {
              address: ${JSON.stringify(address)},
              message: ${JSON.stringify(challenge.message)},
              challengeId: ${JSON.stringify(challenge.id)},
              codeVerifier: ${JSON.stringify(challenge.code_verifier)},
              state: ${JSON.stringify(challenge.state)}
            };
          </script>
          <script src="/js/client/challenge.js"></script>
        </body>
      </html>
    `);
   } catch (error) {
     console.error('Challenge error:', error);
     res.status(500).send('Challenge generation failed');
   }
 });

 router.get('/verify', authLimiter, async (req: Request, res: Response) => {
   try {
     const { signature, challenge_id, address, code_verifier, state } = req.query;
     
     // Validate all required parameters
     if (!signature || !challenge_id || !address || !code_verifier || !state) {
       return res.status(400).send('Missing required parameters');
     }

     const challenge = await challengeService.getChallenge(challenge_id as string);
     
     // Validate challenge and state
     if (!challenge || challenge.state !== state) {
       return res.status(400).send('Invalid challenge or state mismatch');
     }

     // Verify code verifier
     const code_challenge = await generateCodeChallenge(code_verifier as string);
     if (code_challenge !== challenge.code_challenge) {
       return res.status(400).send('Invalid code verifier');
     }

     await cryptoWaitReady();
     const { isValid } = signatureVerify(
       challenge.message,
       signature as string,
       address as string
     );
     
     if (!isValid) {
       return res.status(401).send('Invalid signature');
     }

     await challengeService.markChallengeUsed(challenge_id as string);

     // Instead of redirecting with tokens, return an authorization code
     const authCode = crypto.randomBytes(32).toString('hex');
     await db.run(
       `INSERT INTO auth_codes (
         code, address, client_id, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?)`,
       [
         authCode,
         address,
         challenge.client_id,
         Date.now(),
         Date.now() + (5 * 60 * 1000)
       ]
     );

     // Redirect with auth code instead of tokens
     const client = clients.get(challenge.client_id);
     res.redirect(
       `${client!.redirect_url}?` +
       `code=${authCode}&` +
       `state=${state}`
     );
   } catch (error) {
     console.error('Verification error:', error);
     res.status(500).send('Verification failed');
   }
 });

 // New endpoint for token exchange
 router.post('/token', async (req: Request, res: Response) => {
   try {
     const { code, client_id, client_secret } = req.body;

     // Validate client credentials
     const client = await validateClientCredentials(client_id, client_secret);
     if (!client) {
       return res.status(401).send('Invalid client credentials');
     }

     // Get and validate auth code
     const authCode = await db.get(
       'SELECT * FROM auth_codes WHERE code = ? AND client_id = ? AND used = 0',
       [code, client_id]
     );

     if (!authCode || Date.now() > authCode.expires_at) {
       return res.status(400).send('Invalid or expired authorization code');
     }

     // Generate tokens
     const tokens = tokenService.generateTokens(authCode.address, client_id);

     // Mark auth code as used
     await db.run(
       'UPDATE auth_codes SET used = 1 WHERE code = ?',
       [code]
     );

     // Return tokens in response body
     res.json({
       access_token: tokens.accessToken,
       refresh_token: tokens.refreshToken,
       token_type: 'Bearer',
       expires_in: 900
     });
   } catch (error) {
     console.error('Token exchange error:', error);
     res.status(500).send('Token exchange failed');
   }
 });

 return router;
};

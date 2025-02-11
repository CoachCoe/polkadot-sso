import { Router, Request, Response } from 'express';
import { TokenService } from '../services/token';
import { ChallengeService } from '../services/challengeService';
import { authLimiter } from '../config/auth';
import { Client } from '../types/auth';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { validateAuthRequest, validateSignature } from '../utils/validation';

export const createAuthRouter = (
 tokenService: TokenService,
 challengeService: ChallengeService,
 clients: Map<string, Client>
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
              appName: "Polkadot SSO Demo"
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

     const challenge = challengeService.generateChallenge(client_id as string);
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
              challengeId: ${JSON.stringify(challenge.id)}
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
     const { signature, challenge_id, address } = req.query;
     
     if (!signature || !challenge_id || !address) {
       return res.status(400).send('Missing required parameters');
     }

     const sigValidation = validateSignature(signature as string);
     if (!sigValidation.isValid) {
       return res.status(400).send(sigValidation.error);
     }

     const challenge = await challengeService.getChallenge(challenge_id as string);
     
     if (!challenge) {
       return res.status(400).send('Invalid or used challenge');
     }

     if (Date.now() > challenge.expires_at) {
       return res.status(401).send('Challenge expired');
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

     const tokens = tokenService.generateTokens(
       address as string,
       challenge.client_id
     );
     
     const client = clients.get(challenge.client_id);
     
     res.redirect(
       `${client!.redirect_url}?` +
       `access_token=${tokens.accessToken}&` +
       `refresh_token=${tokens.refreshToken}&` +
       `fingerprint=${tokens.fingerprint}`
     );
   } catch (error) {
     console.error('Verification error:', error);
     res.status(500).send('Verification failed');
   }
 });

 return router;
};

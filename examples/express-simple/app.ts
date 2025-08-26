import { AuthenticatedRequest, polkadotAuth, requireAuth } from '@polkadot-auth/express';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const auth = polkadotAuth({
  basePath: '/auth',
  cors: {
    origin: true,
    credentials: true,
  },
});

app.use('/auth', auth);

app.get('/protected', requireAuth(), (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user,
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Polkadot Auth Example</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 10px 20px; background: #e6007a; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
          .button:hover { background: #c4006a; }
        </style>
      </head>
      <body>
        <h1>Polkadot Auth Example</h1>
        <p>This is a simple example of using Polkadot authentication with Express.js.</p>

        <h2>Quick Start:</h2>
        <ol>
          <li>Click "Sign In" to authenticate with your Polkadot wallet</li>
          <li>Select your preferred wallet and chain</li>
          <li>Sign the authentication message</li>
          <li>Access protected routes</li>
        </ol>

        <a href="/auth/signin" class="button">Sign In with Polkadot</a>
        <a href="/protected" class="button">Protected Route</a>

        <h2>API Endpoints:</h2>
        <ul>
          <li><code>GET /auth/signin</code> - Sign-in page</li>
          <li><code>GET /auth/challenge</code> - Get authentication challenge</li>
          <li><code>POST /auth/verify</code> - Verify signature</li>
          <li><code>POST /auth/signout</code> - Sign out</li>
          <li><code>GET /protected</code> - Protected route (requires auth)</li>
        </ul>

        <h2>Features:</h2>
        <ul>
          <li>✅ SIWE-style authentication messages</li>
          <li>✅ Multiple wallet support (Polkadot.js, Talisman, SubWallet)</li>
          <li>✅ Multi-chain support (Polkadot, Kusama, Westend, Rococo)</li>
          <li>✅ Nonce-based replay protection</li>
          <li>✅ Domain binding security</li>
          <li>✅ Express.js middleware</li>
          <li>✅ TypeScript support</li>
        </ul>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Polkadot Auth Example running on http://localhost:${PORT}`);
  console.log(`📱 Sign in: http://localhost:${PORT}/auth/signin`);
  console.log(`🔒 Protected: http://localhost:${PORT}/protected`);
});

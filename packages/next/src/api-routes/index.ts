import { NextApiRequest, NextApiResponse } from 'next';
import { NextAuthConfig } from '../types';

export function createAuthApiRoutes(config: NextAuthConfig = {}) {
  const basePath = config.basePath || '/api/auth';

  return {
    [`${basePath}/challenge`]: async (req: NextApiRequest, res: NextApiResponse) => {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { client_id, address, chain_id } = req.query;

      if (!client_id || !address || !chain_id) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const challenge = {
        message: `Sign this message to authenticate with Polkadot SSO\n\nClient: ${client_id}\nAddress: ${address}\nChain: ${chain_id}\nNonce: ${Math.random().toString(36).substring(2)}`,
        id: Math.random().toString(36).substring(2),
        nonce: Math.random().toString(36).substring(2),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };

      res.json({
        challenge: challenge.message,
        challenge_id: challenge.id,
        nonce: challenge.nonce,
        expires_at: challenge.expiresAt,
      });
    },

    [`${basePath}/verify`]: async (req: NextApiRequest, res: NextApiResponse) => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { signature, challenge_id, address, message } = req.body;

      if (!signature || !challenge_id || !address || !message) {
        return res.status(400).json({ error: 'challenge_id, signature, address, and message are required' });
      }

      res.json({
        success: true,
        message: 'Authentication successful',
        session: {
          id: Math.random().toString(36).substring(2),
          address: address,
          accessToken: Math.random().toString(36).substring(2),
        },
      });
    },

    [`${basePath}/signout`]: async (req: NextApiRequest, res: NextApiResponse) => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      res.json({
        success: true,
        message: 'Signed out successfully',
      });
    },

    [`${basePath}/callback`]: async (req: NextApiRequest, res: NextApiResponse) => {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { code, state } = req.query;

      res.json({
        message: 'Callback endpoint - implement as needed',
        code,
        state,
      });
    },
  };
}

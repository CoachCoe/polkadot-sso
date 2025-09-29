import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, message, signature, nonce } = req.body;

  if (!address || !message || !signature || !nonce) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Call our existing SSO service to verify the signature
    const ssoResponse = await fetch(`${process.env.SSO_SERVICE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        message,
        signature,
        nonce,
        wallet: 'polkadot'
      })
    });

    if (!ssoResponse.ok) {
      throw new Error('SSO verification failed');
    }

    const ssoResult = await ssoResponse.json();

    if (ssoResult.success) {
      // Create a session or JWT token
      const sessionToken = createSessionToken({
        address,
        chainId: 'polkadot',
        verified: true
      });

      return res.status(200).json({
        success: true,
        token: sessionToken,
        user: {
          address,
          chainId: 'polkadot'
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        error: ssoResult.error || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Polkadot authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function createSessionToken(user: { address: string; chainId: string; verified: boolean }): string {
  // This would typically create a JWT token
  // For this example, we'll return a simple token
  return Buffer.from(JSON.stringify({
    ...user,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  })).toString('base64');
}

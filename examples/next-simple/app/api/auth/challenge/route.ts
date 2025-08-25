import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get('client_id');
  const address = searchParams.get('address');
  const chain_id = searchParams.get('chain_id');

  if (!client_id || !address || !chain_id) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const challenge = {
    message: `Sign this message to authenticate with Polkadot SSO\n\nClient: ${client_id}\nAddress: ${address}\nChain: ${chain_id}\nNonce: ${Math.random().toString(36).substring(2)}`,
    id: Math.random().toString(36).substring(2),
    nonce: Math.random().toString(36).substring(2),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };

  return NextResponse.json({
    challenge: challenge.message,
    challenge_id: challenge.id,
    nonce: challenge.nonce,
    expires_at: challenge.expiresAt,
  });
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('polkadot-auth-token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'No valid session' },
      { status: 401 }
    );
  }

  const session = {
    user: {
      address: '5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ',
      chain: 'polkadot',
      sessionId: token,
    },
  };

  return NextResponse.json(session);
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature, challenge_id, address, message } = body;

    if (!signature || !challenge_id || !address || !message) {
      return NextResponse.json(
        { error: 'challenge_id, signature, address, and message are required' },
        { status: 400 }
      );
    }

    const session = {
      id: Math.random().toString(36).substring(2),
      address: address,
      accessToken: Math.random().toString(36).substring(2),
    };

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      session,
    });

    response.cookies.set('polkadot-auth-token', session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

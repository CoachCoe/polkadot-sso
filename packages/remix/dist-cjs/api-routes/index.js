"use strict";
// Remix API routes for Polkadot authentication
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthApiRoutes = createAuthApiRoutes;
function createAuthApiRoutes(config) {
    const basePath = config.basePath || '/api/auth';
    return {
        // Generate authentication challenge
        async challenge(request) {
            try {
                const url = new URL(request.url);
                const clientId = url.searchParams.get('client_id');
                const address = url.searchParams.get('address');
                const chainId = url.searchParams.get('chain_id');
                if (!clientId || !address || !chainId) {
                    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                // Mock challenge generation (replace with real implementation)
                const challengeId = Math.random().toString(36).substring(2, 15);
                const nonce = Math.random().toString(36).substring(2, 15);
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
                const challenge = `Sign this message to authenticate with Polkadot SSO

Client: ${clientId}
Address: ${address}
Chain: ${chainId}
Nonce: ${nonce}`;
                return new Response(JSON.stringify({
                    challenge,
                    challenge_id: challengeId,
                    nonce,
                    expires_at: expiresAt,
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                });
            }
            catch (error) {
                console.error('Challenge generation error:', error);
                return new Response(JSON.stringify({ error: 'Internal server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        },
        // Verify signature and authenticate
        async verify(request) {
            try {
                const body = (await request.json());
                const { signature, challenge_id, address, message } = body;
                if (!signature || !challenge_id || !address || !message) {
                    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                // Mock verification (replace with real implementation)
                console.log('Verification request:', { signature, challenge_id, address, message });
                // Mock successful verification
                const sessionId = Math.random().toString(36).substring(2, 15);
                const sessionData = {
                    address,
                    chain: 'polkadot',
                    sessionId,
                    authenticatedAt: new Date().toISOString(),
                };
                // Set session cookie
                const response = new Response(JSON.stringify({
                    success: true,
                    session: sessionData,
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
                // Set HTTP-only cookie
                response.headers.set('Set-Cookie', `polkadot-auth=${sessionId}; HttpOnly; Path=/; Max-Age=${config.sessionMaxAge || 3600}; SameSite=Lax`);
                return response;
            }
            catch (error) {
                console.error('Verification error:', error);
                return new Response(JSON.stringify({ error: 'Internal server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        },
        // Sign out
        async signOut(request) {
            try {
                const response = new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
                // Clear session cookie
                response.headers.set('Set-Cookie', 'polkadot-auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
                return response;
            }
            catch (error) {
                console.error('Sign out error:', error);
                return new Response(JSON.stringify({ error: 'Internal server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        },
        // Get current session
        async session(request) {
            try {
                const cookieHeader = request.headers.get('Cookie');
                const sessionId = cookieHeader
                    ?.split(';')
                    .find(c => c.trim().startsWith('polkadot-auth='))
                    ?.split('=')[1];
                if (!sessionId) {
                    return new Response(JSON.stringify({ isAuthenticated: false }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                // Mock session validation (replace with real implementation)
                const sessionData = {
                    address: '5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ',
                    chain: 'polkadot',
                    sessionId,
                    authenticatedAt: new Date().toISOString(),
                };
                return new Response(JSON.stringify({
                    isAuthenticated: true,
                    user: sessionData,
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            catch (error) {
                console.error('Session check error:', error);
                return new Response(JSON.stringify({ error: 'Internal server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        },
    };
}
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
exports.getUserFromRequest = getUserFromRequest;
exports.isAuthenticated = isAuthenticated;
function createAuthMiddleware(config) {
    return {
        async requireAuth(request) {
            try {
                const cookieHeader = request.headers.get('Cookie');
                const sessionId = cookieHeader
                    ?.split(';')
                    .find(c => c.trim().startsWith('polkadot-auth='))
                    ?.split('=')[1];
                if (!sessionId) {
                    const loginUrl = new URL('/login', request.url);
                    loginUrl.searchParams.set('redirect', new URL(request.url).pathname);
                    return Response.redirect(loginUrl.toString(), 302);
                }
                return null;
            }
            catch (error) {
                console.error('Auth middleware error:', error);
                return Response.redirect('/login', 302);
            }
        },
        async optionalAuth(request) {
            try {
                const cookieHeader = request.headers.get('Cookie');
                const sessionId = cookieHeader
                    ?.split(';')
                    .find(c => c.trim().startsWith('polkadot-auth='))
                    ?.split('=')[1];
                return null;
            }
            catch (error) {
                console.error('Optional auth middleware error:', error);
                return null; // Continue anyway
            }
        },
    };
}
async function getUserFromRequest(request) {
    try {
        const cookieHeader = request.headers.get('Cookie');
        const sessionId = cookieHeader
            ?.split(';')
            .find(c => c.trim().startsWith('polkadot-auth='))
            ?.split('=')[1];
        if (!sessionId) {
            return null;
        }
        return {
            address: '5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ',
            chain: 'polkadot',
            sessionId,
            authenticatedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}
async function isAuthenticated(request) {
    const user = await getUserFromRequest(request);
    return user !== null;
}
//# sourceMappingURL=index.js.map
import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { Link } from '@remix-run/react';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetcher = useFetcher();

  useEffect(() => {
    // Check authentication status on mount
    fetcher.load('/api/auth/session');
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setIsAuthenticated((fetcher.data as any).isAuthenticated);
      setUser((fetcher.data as any).user);
      setIsLoading(false);
    }
  }, [fetcher.data]);

  const handleSignOut = () => {
    fetcher.submit({}, { method: 'post', action: '/api/auth/signout' });
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className='container'>
        <div className='header'>
          <h1 className='title'>Polkadot Auth - Remix Example</h1>
          <p className='subtitle'>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <div className='header'>
        <h1 className='title'>Polkadot Auth - Remix Example</h1>
        <p className='subtitle'>Sign-In with Ethereum (SIWE) style authentication for Polkadot</p>
      </div>

      <nav className='nav'>
        <Link to='/'>Home</Link>
        <Link to='/protected'>Protected Page</Link>
        <Link to='/login'>Login</Link>
      </nav>

      <div className='card'>
        <h2>Authentication Status</h2>
        {isAuthenticated ? (
          <div className='status success'>
            <strong>✅ Authenticated</strong>
            <p>Welcome, {user?.address}!</p>
            <p>Chain: {user?.chain}</p>
            <p>Session ID: {user?.sessionId}</p>
            <button className='button' onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <div className='status error'>
            <strong>❌ Not Authenticated</strong>
            <p>Please sign in to access protected features.</p>
            <Link to='/login' className='button'>
              Sign In with Polkadot
            </Link>
          </div>
        )}
      </div>

      <div className='card'>
        <h2>Features</h2>
        <div className='features'>
          <div className='feature'>
            <h3>🔐 SIWE-style Authentication</h3>
            <p>Sign-In with Ethereum compatible message format for Polkadot</p>
          </div>
          <div className='feature'>
            <h3>🎯 Remix Integration</h3>
            <p>Native Remix API routes and middleware support</p>
          </div>
          <div className='feature'>
            <h3>🔒 Session Management</h3>
            <p>HTTP-only cookies with secure session handling</p>
          </div>
          <div className='feature'>
            <h3>🛡️ Type Safety</h3>
            <p>Full TypeScript support across all components</p>
          </div>
          <div className='feature'>
            <h3>🌐 Multi-Chain</h3>
            <p>Support for Polkadot, Kusama, Westend, and Rococo</p>
          </div>
          <div className='feature'>
            <h3>🎨 React Components</h3>
            <p>Ready-to-use UI components and hooks</p>
          </div>
        </div>
      </div>

      <div className='card'>
        <h2>API Endpoints</h2>
        <p>The following API endpoints are available:</p>
        <ul>
          <li>
            <code>GET /api/auth/challenge</code> - Generate authentication challenge
          </li>
          <li>
            <code>POST /api/auth/verify</code> - Verify signature and authenticate
          </li>
          <li>
            <code>POST /api/auth/signout</code> - Sign out and clear session
          </li>
          <li>
            <code>GET /api/auth/session</code> - Get current session status
          </li>
        </ul>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useFetcher, Link } from '@remix-run/react';

export default function Protected() {
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

  if (isLoading) {
    return (
      <div className='container'>
        <div className='header'>
          <h1 className='title'>Protected Page</h1>
          <p className='subtitle'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='container'>
        <div className='header'>
          <h1 className='title'>Protected Page</h1>
          <p className='subtitle'>Access Denied</p>
        </div>

        <nav className='nav'>
          <Link to='/'>Home</Link>
          <Link to='/protected'>Protected Page</Link>
          <Link to='/login'>Login</Link>
        </nav>

        <div className='card'>
          <div className='status error'>
            <strong>❌ Access Denied</strong>
            <p>You must be authenticated to view this page.</p>
            <Link to='/login' className='button'>
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <div className='header'>
        <h1 className='title'>Protected Page</h1>
        <p className='subtitle'>Welcome to the protected area!</p>
      </div>

      <nav className='nav'>
        <Link to='/'>Home</Link>
        <Link to='/protected'>Protected Page</Link>
        <Link to='/login'>Login</Link>
      </nav>

      <div className='card'>
        <div className='status success'>
          <strong>✅ Access Granted</strong>
          <p>You have successfully authenticated!</p>
        </div>

        <h2>User Information</h2>
        <div className='feature'>
          <p>
            <strong>Address:</strong> {user?.address}
          </p>
          <p>
            <strong>Chain:</strong> {user?.chain}
          </p>
          <p>
            <strong>Session ID:</strong> {user?.sessionId}
          </p>
          <p>
            <strong>Authenticated At:</strong> {user?.authenticatedAt}
          </p>
        </div>

        <h2>Protected Content</h2>
        <p>This content is only visible to authenticated users. You can now:</p>
        <ul>
          <li>Access premium features</li>
          <li>View sensitive data</li>
          <li>Perform authenticated operations</li>
          <li>Manage your account settings</li>
        </ul>
      </div>
    </div>
  );
}

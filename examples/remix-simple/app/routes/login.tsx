import { Link, useFetcher } from '@remix-run/react';
import { useState } from 'react';

export default function Login() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('polkadot');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fetcher = useFetcher();

  const handleSignIn = async () => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Get challenge
      const challengeResponse = await fetch(
        `/api/auth/challenge?client_id=remix-app&address=${address}&chain_id=${chain}`
      );

      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge');
      }

      const challengeData = await challengeResponse.json();

      // 2. Sign with wallet (mock for now)
      const signature = '0x' + Math.random().toString(16).substring(2, 66);

      // 3. Verify signature
      fetcher.submit(
        {
          signature,
          challenge_id: challengeData.challenge_id,
          address,
          message: challengeData.challenge,
        },
        { method: 'post', action: '/api/auth/verify' }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsLoading(false);
    }
  };

  // Handle successful authentication
  if ((fetcher.data as any)?.success) {
    return (
      <div className='container'>
        <div className='header'>
          <h1 className='title'>Login Successful</h1>
          <p className='subtitle'>Welcome to Polkadot Auth!</p>
        </div>

        <nav className='nav'>
          <Link to='/'>Home</Link>
          <Link to='/protected'>Protected Page</Link>
          <Link to='/login'>Login</Link>
        </nav>

        <div className='card'>
          <div className='status success'>
            <strong>✅ Authentication Successful</strong>
            <p>You have been successfully authenticated.</p>
            <Link to='/' className='button'>
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <div className='header'>
        <h1 className='title'>Sign In with Polkadot</h1>
        <p className='subtitle'>Authenticate using your Polkadot wallet</p>
      </div>

      <nav className='nav'>
        <Link to='/'>Home</Link>
        <Link to='/protected'>Protected Page</Link>
        <Link to='/login'>Login</Link>
      </nav>

      <div className='card'>
        <h2>Authentication</h2>

        {error && (
          <div className='status error'>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor='address' style={{ display: 'block', marginBottom: '0.5rem' }}>
            <strong>Address:</strong>
          </label>
          <input
            id='address'
            type='text'
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder='5EJP9eSB1HpzjpuCJrna8KMcA6mmgaT8W4gSmwHaVDn25gHQ'
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor='chain' style={{ display: 'block', marginBottom: '0.5rem' }}>
            <strong>Chain:</strong>
          </label>
          <select
            id='chain'
            value={chain}
            onChange={e => setChain(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          >
            <option value='polkadot'>Polkadot</option>
            <option value='kusama'>Kusama</option>
            <option value='westend'>Westend</option>
            <option value='rococo'>Rococo</option>
          </select>
        </div>

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className='button'
          style={{ width: '100%' }}
        >
          {isLoading ? 'Signing...' : 'Sign In with Polkadot'}
        </button>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          <p>
            <strong>Note:</strong> This is a demo implementation. In a real application, you would:
          </p>
          <ul>
            <li>Connect to an actual Polkadot wallet (Polkadot.js Extension, Talisman, etc.)</li>
            <li>Sign the challenge message with your private key</li>
            <li>Verify the signature cryptographically</li>
            <li>Store sessions securely in a database</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

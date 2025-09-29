import { useState } from 'react';
import { usePolkadotAuth, PolkadotWalletSelector } from '@polkadot-sso/better-auth-polkadot';

export default function Demo() {
  const [authResult, setAuthResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const {
    wallets,
    account,
    loading: authLoading,
    error: authError,
    isConnected,
    connectWallet,
    signIn,
    signOut,
    clearError
  } = usePolkadotAuth({
    domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost:3000',
    appName: 'Polkadot Auth Demo',
    appVersion: '1.0.0',
    statement: 'Sign in with Polkadot to access the demo app',
    chainId: 'polkadot',
    enableIdentityResolution: true
  });

  const handleSignIn = async () => {
    setLoading(true);
    setAuthResult(null);
    clearError();

    try {
      const result = await signIn();
      
      if (result.success) {
        // Send the authentication result to our API
        const response = await fetch('/api/polkadot-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: result.address,
            message: result.message,
            signature: result.signature,
            nonce: result.nonce
          })
        });

        const apiResult = await response.json();
        setAuthResult(apiResult);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthResult(null);
  };

  if (authLoading) {
    return (
      <div className="container">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Polkadot Authentication Demo</h1>
      
      {authError && (
        <div className="error">
          <p>Error: {authError}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}

      {!isConnected ? (
        <PolkadotWalletSelector
          wallets={wallets}
          onWalletSelect={connectWallet}
          loading={authLoading}
          error={authError}
        />
      ) : (
        <div className="account-section">
          <h2>Connected Account</h2>
          <div className="account-info">
            <p><strong>Address:</strong> {account?.address}</p>
            <p><strong>Name:</strong> {account?.name || 'Unnamed'}</p>
            <p><strong>Source:</strong> {account?.source}</p>
            <p><strong>Type:</strong> {account?.type || 'Unknown'}</p>
          </div>
          
          <div className="actions">
            <button 
              onClick={handleSignIn} 
              disabled={loading}
              className="sign-in-button"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <button 
              onClick={handleSignOut}
              className="sign-out-button"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {authResult && (
        <div className="auth-result">
          <h2>Authentication Result</h2>
          {authResult.success ? (
            <div className="success">
              <p>✅ Authentication successful!</p>
              <p><strong>Address:</strong> {authResult.user.address}</p>
              <p><strong>Chain ID:</strong> {authResult.user.chainId}</p>
              <p><strong>Token:</strong> {authResult.token.substring(0, 50)}...</p>
            </div>
          ) : (
            <div className="failure">
              <p>❌ Authentication failed: {authResult.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="info">
        <h2>How it works</h2>
        <ol>
          <li>Select and connect to a Polkadot wallet (Polkadot.js, Talisman, or SubWallet)</li>
          <li>Click "Sign In" to create a cryptographic challenge</li>
          <li>Sign the message in your wallet</li>
          <li>The signature is verified by our SSO service</li>
          <li>You receive a session token for authenticated access</li>
        </ol>
      </div>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 2rem;
        }

        .error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 2rem;
        }

        .error button {
          background: #c33;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 0.5rem;
        }

        .account-section {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .account-info {
          background: white;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .account-info p {
          margin: 0.5rem 0;
          word-break: break-all;
        }

        .actions {
          display: flex;
          gap: 1rem;
        }

        .sign-in-button {
          background: #e6007a;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .sign-in-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .sign-out-button {
          background: #666;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .auth-result {
          background: #f0f8ff;
          border: 1px solid #b0d4f1;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .success {
          color: #28a745;
        }

        .failure {
          color: #dc3545;
        }

        .info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 2rem;
        }

        .info h2 {
          margin-top: 0;
        }

        .info ol {
          line-height: 1.6;
        }

        .info li {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}

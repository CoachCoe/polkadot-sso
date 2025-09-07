// Note: These imports will work once the packages are published
// For now, we'll use relative imports to the built packages
import { usePolkadotAuth } from '../../../packages/client-sdk/src/hooks/usePolkadotAuth';
import { PolkadotSignInButton } from '../../../packages/ui/src/components/PolkadotSignInButton';
import './App.css';

function App() {
  const {
    isAuthenticated,
    isLoading,
    error,
    session,
    availableWallets,
    connect,
    disconnect,
    clearError,
  } = usePolkadotAuth({
    ssoEndpoint: 'http://localhost:3001',
    clientId: 'trex-demo-app',
    clientSecret: 'your-secret-key',
    redirectUri: 'http://localhost:5173/callback',
    defaultChain: 'polkadot',
    supportedWallets: ['polkadot-js', 'talisman', 'subwallet'],
  });

  const handleSignIn = (address: string, session: any) => {
    console.log('User signed in:', address, session);
  };

  const handleError = (error: string) => {
    console.error('Auth error:', error);
  };

  if (isAuthenticated && session) {
    return (
      <div className='app'>
        <header className='app-header'>
          <h1>🚀 T-REX Demo dApp</h1>
          <div className='user-info'>
            <span className='address'>
              Connected: {session.address.slice(0, 8)}...{session.address.slice(-8)}
            </span>
            <button onClick={disconnect} className='disconnect-btn'>
              Disconnect
            </button>
          </div>
        </header>

        <main className='app-main'>
          <div className='dashboard'>
            <h2>🎯 Token Deployment Dashboard</h2>
            <p>Welcome! You're now authenticated and ready to deploy ERC-3643 tokens.</p>

            <div className='deployment-section'>
              <h3>📋 Deployment Steps</h3>
              <div className='steps'>
                <div className='step completed'>
                  <span className='step-number'>1</span>
                  <span className='step-text'>Connect Wallet & Authenticate</span>
                </div>
                <div className='step'>
                  <span className='step-number'>2</span>
                  <span className='step-text'>Deploy TrustedIssuers Registry</span>
                </div>
                <div className='step'>
                  <span className='step-number'>3</span>
                  <span className='step-text'>Deploy ClaimTopics Registry</span>
                </div>
                <div className='step'>
                  <span className='step-number'>4</span>
                  <span className='step-text'>Deploy Identity Storage</span>
                </div>
                <div className='step'>
                  <span className='step-number'>5</span>
                  <span className='step-text'>Deploy Identity Registry</span>
                </div>
                <div className='step'>
                  <span className='step-number'>6</span>
                  <span className='step-text'>Deploy Default Compliance</span>
                </div>
                <div className='step'>
                  <span className='step-number'>7</span>
                  <span className='step-text'>Deploy Token Contract</span>
                </div>
              </div>
            </div>

            <div className='session-info'>
              <h3>🔐 Session Information</h3>
              <div className='info-grid'>
                <div className='info-item'>
                  <label>Address:</label>
                  <span className='monospace'>{session.address}</span>
                </div>
                <div className='info-item'>
                  <label>Authenticated:</label>
                  <span>{new Date(session.authenticatedAt).toLocaleString()}</span>
                </div>
                <div className='info-item'>
                  <label>Token Expires:</label>
                  <span>{new Date(session.tokens.expiresAt).toLocaleString()}</span>
                </div>
                <div className='info-item'>
                  <label>Available Wallets:</label>
                  <span>{availableWallets.join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className='app'>
      <header className='app-header'>
        <h1>🚀 T-REX Demo dApp</h1>
        <p>Deploy ERC-3643 compliant security tokens on Polkadot</p>
      </header>

      <main className='app-main'>
        <div className='auth-section'>
          <h2>🔐 Authentication Required</h2>
          <p>Connect your Polkadot wallet to start deploying tokens</p>

          {error && (
            <div className='error-message'>
              <p>{error}</p>
              <button onClick={clearError} className='clear-error-btn'>
                Clear Error
              </button>
            </div>
          )}

          <div className='auth-options'>
            <PolkadotSignInButton
              onSignIn={handleSignIn}
              onError={handleError}
              className='trex-signin-button'
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet & Authenticate'}
            </PolkadotSignInButton>

            <div className='wallet-options'>
              <h3>Available Wallets:</h3>
              <div className='wallet-list'>
                {availableWallets.map((wallet: string) => (
                  <button
                    key={wallet}
                    onClick={() => connect(wallet)}
                    className='wallet-btn'
                    disabled={isLoading}
                  >
                    {wallet}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className='features'>
            <h3>✨ Features</h3>
            <ul>
              <li>🔐 Secure wallet-based authentication</li>
              <li>📋 Step-by-step token deployment wizard</li>
              <li>🏗️ T-REX framework integration</li>
              <li>📊 Asset dashboard and management</li>
              <li>🌐 Multi-wallet support</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

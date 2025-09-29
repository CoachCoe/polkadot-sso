import { useState, useEffect } from 'react'
import { createPolkadotAuthClient } from '@polkadot-sso/better-auth-polkadot'
import type { PolkadotWalletInfo, PolkadotAccount } from '@polkadot-sso/better-auth-polkadot'

export default function Home() {
  const [auth, setAuth] = useState<any>(null)
  const [wallets, setWallets] = useState<PolkadotWalletInfo[]>([])
  const [account, setAccount] = useState<PolkadotAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const polkadotAuth = createPolkadotAuthClient({
          domain: window.location.hostname,
          appName: "Polkadot Auth Example",
          appVersion: "1.0.0",
          statement: "Sign in with Polkadot to access the example app",
          chainId: "polkadot"
        })

        await polkadotAuth.init()
        const availableWallets = await polkadotAuth.getAvailableWallets()
        
        setAuth(polkadotAuth)
        setWallets(availableWallets)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize auth')
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const connectWallet = async (walletName: string) => {
    if (!auth) return

    try {
      setError(null)
      const accounts = await auth.connectWallet(walletName)
      if (accounts.length > 0) {
        setAccount(accounts[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    }
  }

  const signIn = async () => {
    if (!auth || !account) return

    try {
      setError(null)
      const result = await auth.signIn()
      if (result.success) {
        alert(`Successfully signed in with ${result.address}`)
      } else {
        setError(result.error || 'Sign in failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    }
  }

  const signOut = async () => {
    if (!auth) return

    try {
      await auth.signOut()
      setAccount(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Loading...</h1>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Polkadot Authentication Example</h1>
      
      {error && (
        <div className="error">
          <p>Error: {error}</p>
        </div>
      )}

      {!account ? (
        <div className="wallet-selection">
          <h2>Select a Wallet</h2>
          <div className="wallets">
            {wallets.map((wallet) => (
              <div key={wallet.name} className="wallet-card">
                <img src={wallet.icon} alt={wallet.name} />
                <h3>{wallet.name}</h3>
                <p>{wallet.installed ? 'Installed' : 'Not Installed'}</p>
                <button
                  onClick={() => connectWallet(wallet.name)}
                  disabled={!wallet.installed}
                >
                  {wallet.installed ? 'Connect' : 'Install'}
                </button>
                {!wallet.installed && (
                  <a href={wallet.url} target="_blank" rel="noopener noreferrer">
                    Install {wallet.name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="account-info">
          <h2>Connected Account</h2>
          <div className="account-details">
            <p><strong>Address:</strong> {account.address}</p>
            <p><strong>Name:</strong> {account.name || 'Unnamed'}</p>
            <p><strong>Source:</strong> {account.source}</p>
            <p><strong>Type:</strong> {account.type || 'Unknown'}</p>
          </div>
          <div className="actions">
            <button onClick={signIn}>Sign In</button>
            <button onClick={signOut}>Disconnect</button>
          </div>
        </div>
      )}

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

        .wallet-selection h2 {
          text-align: center;
          margin-bottom: 2rem;
        }

        .wallets {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .wallet-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .wallet-card img {
          width: 48px;
          height: 48px;
          margin-bottom: 1rem;
        }

        .wallet-card h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .wallet-card p {
          margin: 0 0 1rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .wallet-card button {
          background: #e6007a;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 0.5rem;
        }

        .wallet-card button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .wallet-card a {
          color: #e6007a;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .account-info {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 2rem;
        }

        .account-details {
          background: white;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .account-details p {
          margin: 0.5rem 0;
          word-break: break-all;
        }

        .actions {
          display: flex;
          gap: 1rem;
        }

        .actions button {
          background: #e6007a;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .actions button:last-child {
          background: #666;
        }
      `}</style>
    </div>
  )
}

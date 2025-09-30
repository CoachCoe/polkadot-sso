import React, { useState } from "react"
import { usePolkadotAuth } from "../hooks/usePolkadotAuth"
import type { PolkadotAccount } from "../client"

interface PolkadotWalletSelectorProps {
  appName: string
  ssoUrl: string
  onSuccess?: (user: any) => void
  onError?: (error: string) => void
}

export function PolkadotWalletSelector({ 
  appName, 
  ssoUrl, 
  onSuccess, 
  onError 
}: PolkadotWalletSelectorProps) {
  const { 
    accounts, 
    user, 
    loading, 
    error, 
    connectWallet, 
    signIn 
  } = usePolkadotAuth({ appName, ssoUrl })

  const [selectedAccount, setSelectedAccount] = useState<PolkadotAccount | null>(null)

  const handleConnectWallet = async () => {
    try {
      await connectWallet()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to connect wallet")
    }
  }

  const handleSignIn = async () => {
    if (!selectedAccount) return

    try {
      await signIn(selectedAccount.address, selectedAccount.chain)
      onSuccess?.(user)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Authentication failed")
    }
  }

  if (user) {
    return (
      <div className="polkadot-auth-success">
        <h3>Welcome!</h3>
        <p>Address: {selectedAccount?.address}</p>
        <p>Chain: {selectedAccount?.chain}</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="polkadot-wallet-selector">
        <button 
          onClick={handleConnectWallet}
          disabled={loading}
          className="connect-wallet-btn"
        >
          {loading ? "Connecting..." : "Connect Polkadot Wallet"}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    )
  }

  return (
    <div className="polkadot-wallet-selector">
      <h3>Select Account</h3>
      <div className="accounts-list">
        {accounts.map((account) => (
          <div 
            key={account.address}
            className={`account-item ${selectedAccount?.address === account.address ? 'selected' : ''}`}
            onClick={() => setSelectedAccount(account)}
          >
            <div className="account-name">{account.name || "Unnamed Account"}</div>
            <div className="account-address">{account.address}</div>
            <div className="account-chain">{account.chain}</div>
          </div>
        ))}
      </div>
      
      {selectedAccount && (
        <button 
          onClick={handleSignIn}
          disabled={loading}
          className="sign-in-btn"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  )
}
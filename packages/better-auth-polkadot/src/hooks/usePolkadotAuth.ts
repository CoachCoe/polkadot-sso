import { useState, useEffect } from 'react'
import { PolkadotAuthClient, PolkadotAccount, PolkadotUser, PolkadotSession } from '../client'

export interface UsePolkadotAuthOptions {
  appName: string
  ssoUrl: string
}

export interface UsePolkadotAuthReturn {
  accounts: PolkadotAccount[]
  user: PolkadotUser | null
  session: PolkadotSession | null
  loading: boolean
  error: string | null
  connectWallet: () => Promise<void>
  signIn: (address: string, chain: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const usePolkadotAuth = (options: UsePolkadotAuthOptions): UsePolkadotAuthReturn => {
  const [accounts, setAccounts] = useState<PolkadotAccount[]>([])
  const [user, setUser] = useState<PolkadotUser | null>(null)
  const [session, setSession] = useState<PolkadotSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const client = new PolkadotAuthClient(options.appName, options.ssoUrl)

  const connectWallet = async () => {
    setLoading(true)
    setError(null)

    try {
      const walletAccounts = await client.getAccounts()
      setAccounts(walletAccounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (address: string, chain: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await client.authenticate(address, chain)
      setUser(result.user)
      setSession(result.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError(null)

    try {
      await fetch(`${options.ssoUrl}/api/auth/signout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      setUser(null)
      setSession(null)
      setAccounts([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const response = await fetch(`${options.ssoUrl}/api/auth/session`, {
        credentials: 'include'
      })

      if (response.ok) {
        const sessionData = await response.json()
        if (sessionData.user) {
          setUser(sessionData.user)
          setSession(sessionData.session)
        }
      }
    } catch (err) {
      // Session refresh failed, user needs to authenticate
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  return {
    accounts,
    user,
    session,
    loading,
    error,
    connectWallet,
    signIn,
    signOut,
    refreshSession
  }
}
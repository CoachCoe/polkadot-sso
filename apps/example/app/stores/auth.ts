import { defineStore } from 'pinia'
import { useAuthService } from '~/services/authService'

interface Session {
  user: {
    address: string
    chain: string
    wallet: string
  }
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export const useAuthStore = defineStore('auth', () => {
  const authService = useAuthService()

  const session = ref<Session | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Check authentication status on initialization
  async function checkAuth(force = false) {
    // Don't check again if already initialized (unless forced) and not on client
    if (!force && initialized.value || !import.meta.client) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const currentSession = await authService.getSession()
      if (currentSession) {
        session.value = currentSession
        isAuthenticated.value = true
      } else {
        session.value = null
        isAuthenticated.value = false
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      session.value = null
      isAuthenticated.value = false
      error.value = err instanceof Error ? err.message : 'Authentication check failed'
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  // Initialize auth check immediately on client side
  if (import.meta.client) {
    checkAuth()
  }

  // Sign in with wallet signature
  async function signIn(signature: string, challengeId: string, address: string) {
    loading.value = true
    error.value = null

    try {
      const result = await authService.verifySignature(signature, challengeId, address)

      if (result.success) {
        // Get session after successful verification
        const newSession = await authService.getSession()
        if (newSession) {
          session.value = newSession
          isAuthenticated.value = true
          return true
        }
      }

      throw new Error('Sign in failed')
    } catch (err) {
      console.error('Sign in failed:', err)
      error.value = err instanceof Error ? err.message : 'Sign in failed'
      return false
    } finally {
      loading.value = false
    }
  }

  // Sign out
  async function signOut() {
    loading.value = true
    error.value = null

    try {
      await authService.logout()
      session.value = null
      isAuthenticated.value = false
    } catch (err) {
      console.error('Sign out failed:', err)
      error.value = err instanceof Error ? err.message : 'Sign out failed'
    } finally {
      loading.value = false
    }
  }

  // Refresh access token
  async function refreshToken() {
    try {
      await authService.refreshAccessToken()
      const newSession = await authService.getSession()
      if (newSession) {
        session.value = newSession
        isAuthenticated.value = true
      }
    } catch (err) {
      console.error('Token refresh failed:', err)
      session.value = null
      isAuthenticated.value = false
      throw err
    }
  }

  return {
    // State
    session: readonly(session),
    isAuthenticated: readonly(isAuthenticated),
    loading: readonly(loading),
    error: readonly(error),
    initialized: readonly(initialized),

    // Actions
    checkAuth,
    signIn,
    signOut,
    refreshToken
  }
})
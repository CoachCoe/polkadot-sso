import axios from 'axios'

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

class AuthService {
  private ssoServerUrl: string
  private clientId: string
  private clientSecret: string
  private redirectUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor() {
    const config = useRuntimeConfig()
    this.ssoServerUrl = config.public.ssoServerUrl
    this.clientId = config.public.ssoClientId
    this.clientSecret = config.public.ssoClientSecret
    this.redirectUrl = config.public.ssoRedirectUrl
    this.loadTokens()
  }

  private loadTokens() {
    if (import.meta.client) {
      this.accessToken = localStorage.getItem('access_token')
      this.refreshToken = localStorage.getItem('refresh_token')
    }
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    if (import.meta.client) {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    }
  }

  private clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    if (import.meta.client) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }


  async exchangeCodeForTokens(code: string) {
    try {
      const response = await axios.post(`${this.ssoServerUrl}/api/auth/token`, {
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUrl
      })

      const { access_token, refresh_token, expires_in, token_type } = response.data
      this.saveTokens(access_token, refresh_token)

      // Store the full token response for display
      if (import.meta.client) {
        sessionStorage.setItem('token_response', JSON.stringify(response.data))
      }

      return { success: true, tokens: response.data }
    } catch (error) {
      console.error('Token exchange failed:', error)
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  getTokenResponse() {
    if (import.meta.client) {
      const stored = sessionStorage.getItem('token_response')
      return stored ? JSON.parse(stored) : null
    }
    return null
  }

  async getSession(): Promise<Session | null> {
    if (!this.accessToken) {
      return null
    }

    try {
      const response = await axios.get(`${this.ssoServerUrl}/api/auth/session`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      return response.data
    } catch (error) {
      // Token might be expired - try refresh
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken()
          return await this.getSession()
        } catch (refreshError) {
          this.clearTokens()
          return null
        }
      }
      this.clearTokens()
      return null
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await axios.post(`${this.ssoServerUrl}/api/auth/token`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })

      const { access_token, refresh_token } = response.data
      this.saveTokens(access_token, refresh_token)

      return access_token
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  async logout() {
    if (this.accessToken) {
      try {
        await axios.post(
          `${this.ssoServerUrl}/api/auth/logout`,
          { access_token: this.accessToken },
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`
            }
          }
        )
      } catch (error) {
        console.error('Logout request failed:', error)
      }
    }

    this.clearTokens()
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  getStoredTokens() {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    }
  }
}

let authServiceInstance: AuthService | null = null

export const useAuthService = () => {
  // Create singleton instance only on client side
  if (import.meta.client && !authServiceInstance) {
    authServiceInstance = new AuthService()
  }

  // Return instance or create new one for each call on server side
  return authServiceInstance || new AuthService()
}
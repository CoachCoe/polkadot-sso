export interface PolkadotAccount {
  address: string
  name?: string
  source: string
  chain: string
}

export interface PolkadotUser {
  id: string
  address: string
  chain: string
  provider: string
  createdAt: Date
  updatedAt: Date
}

export interface PolkadotSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export class PolkadotAuthClient {
  private appName: string
  private ssoUrl: string

  constructor(appName: string, ssoUrl: string) {
    this.appName = appName
    this.ssoUrl = ssoUrl
  }

  async getAccounts(): Promise<PolkadotAccount[]> {
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
      
      await web3Enable(this.appName)
      const accounts = await web3Accounts()
      
      return accounts.map(account => ({
        address: account.address,
        name: account.meta.name,
        source: account.meta.source,
        chain: this.detectChain(account.address)
      }))
    } catch (error) {
      console.error('Failed to get accounts:', error)
      return []
    }
  }

  async signMessage(address: string, message: string): Promise<string> {
    try {
      const { web3FromAddress } = await import('@polkadot/extension-dapp')
      
      const injector = await web3FromAddress(address)
      if (!injector.signer) {
        throw new Error('No signer available')
      }

      const signer = injector.signer
      const signature = await signer.signRaw({
        address,
        data: message,
        type: 'bytes'
      })

      return signature.signature
    } catch (error) {
      console.error('Failed to sign message:', error)
      throw error
    }
  }

  async authenticate(address: string, chain: string): Promise<any> {
    try {
      const challengeResponse = await fetch(`${this.ssoUrl}/api/auth/polkadot/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain })
      })

      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge')
      }

      const challenge = await challengeResponse.json()
      const signature = await this.signMessage(address, challenge.message)

      const verifyResponse = await fetch(`${this.ssoUrl}/api/auth/polkadot/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          address,
          message: challenge.message,
          chain
        })
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify signature')
      }

      return verifyResponse.json()
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    }
  }

  private detectChain(address: string): string {
    if (address.startsWith('1')) return 'polkadot'
    if (address.startsWith('C')) return 'kusama'
    if (address.startsWith('5')) return 'westend'
    return 'unknown'
  }
}

export const createPolkadotAuthClient = (appName: string, ssoUrl: string) => {
  return new PolkadotAuthClient(appName, ssoUrl)
}
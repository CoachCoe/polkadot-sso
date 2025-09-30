import { BetterAuthPlugin } from "better-auth"
import { verifySignature, generateChallenge, generateNonce, isValidAddress } from "./crypto"
import { randomBytes } from "crypto"

export interface PolkadotProvider {
  id: string
  name: string
  chain: string
  rpcUrl: string
  ss58Format: number
  decimals: number
  tokenSymbol: string
}

export interface PolkadotPluginOptions {
  providers: PolkadotProvider[]
  domain: string
  appName?: string
  appVersion?: string
  statement?: string
  uri?: string
  sessionMaxAge?: number
}

export const polkadotPlugin = (options: PolkadotPluginOptions): BetterAuthPlugin => {
  const config = {
    appName: options.appName || "Polkadot App",
    appVersion: options.appVersion || "1.0.0",
    statement: options.statement || `Sign in with Polkadot to ${options.appName || "Polkadot App"}`,
    uri: options.uri || `https://${options.domain}`,
    sessionMaxAge: options.sessionMaxAge || 3600,
    ...options
  }

  const challengeStore = new Map<string, { address: string, chain: string, expiresAt: number }>()

  return {
    id: "polkadot",
    
    onRequest: async (request: Request, ctx: any) => {
      const url = new URL(request.url)
      
      if (url.pathname === "/api/auth/polkadot/challenge" && request.method === "POST") {
        try {
          const body = await request.json()
          const { address, chain } = body

          if (!address || !chain) {
            return {
              response: new Response(JSON.stringify({
                error: "Missing required parameters",
                code: "MISSING_PARAMETERS"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          const provider = config.providers.find(p => p.chain === chain)
          if (!provider) {
            return {
              response: new Response(JSON.stringify({
                error: "Unsupported chain",
                code: "UNSUPPORTED_CHAIN"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          if (!isValidAddress(address, provider.ss58Format)) {
            return {
              response: new Response(JSON.stringify({
                error: "Invalid address format",
                code: "INVALID_ADDRESS"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          const nonce = generateNonce()
          const challenge = generateChallenge(address, chain)
          const expiresAt = Date.now() + 300000

          challengeStore.set(nonce, { address, chain, expiresAt })

          setTimeout(() => {
            challengeStore.delete(nonce)
          }, 300000)

          return {
            response: new Response(JSON.stringify({
              message: challenge,
              nonce,
              chain,
              expiresAt,
              domain: config.domain,
              uri: config.uri,
              version: config.appVersion,
              statement: config.statement
            }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            })
          }
        } catch (error) {
          return {
            response: new Response(JSON.stringify({
              error: "Internal server error",
              code: "INTERNAL_ERROR"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            })
          }
        }
      }
      
      if (url.pathname === "/api/auth/polkadot/verify" && request.method === "POST") {
        try {
          const body = await request.json()
          const { signature, nonce, address, message } = body

          if (!signature || !nonce || !address || !message) {
            return {
              response: new Response(JSON.stringify({
                error: "Missing required parameters",
                code: "MISSING_PARAMETERS"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          const challengeData = challengeStore.get(nonce)
          if (!challengeData) {
            return {
              response: new Response(JSON.stringify({
                error: "Invalid or expired challenge",
                code: "INVALID_CHALLENGE"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          if (challengeData.address !== address) {
            return {
              response: new Response(JSON.stringify({
                error: "Address mismatch",
                code: "ADDRESS_MISMATCH"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          if (Date.now() > challengeData.expiresAt) {
            challengeStore.delete(nonce)
            return {
              response: new Response(JSON.stringify({
                error: "Challenge expired",
                code: "CHALLENGE_EXPIRED"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          const provider = config.providers.find(p => p.chain === challengeData.chain)
          if (!provider) {
            return {
              response: new Response(JSON.stringify({
                error: "Provider not found",
                code: "PROVIDER_NOT_FOUND"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          const isValid = await verifySignature(message, signature, address, provider)
          if (!isValid) {
            return {
              response: new Response(JSON.stringify({
                error: "Invalid signature",
                code: "INVALID_SIGNATURE"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          challengeStore.delete(nonce)

          const userId = `polkadot_${address}_${challengeData.chain}`
          const sessionId = randomBytes(32).toString('hex')
          const token = randomBytes(32).toString('hex')

          return {
            response: new Response(JSON.stringify({
              user: {
                id: userId,
                address,
                chain: challengeData.chain,
                provider: provider.id,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              session: {
                id: sessionId,
                userId,
                token,
                expiresAt: new Date(Date.now() + config.sessionMaxAge * 1000),
                createdAt: new Date()
              },
              token
            }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            })
          }
        } catch (error) {
          return {
            response: new Response(JSON.stringify({
              error: "Internal server error",
              code: "INTERNAL_ERROR"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            })
          }
        }
      }

      return null
    }
  }
}
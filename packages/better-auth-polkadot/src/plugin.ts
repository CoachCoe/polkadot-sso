import type { BetterAuthPlugin } from "better-auth"
import { verifySignature, generateNonce, isValidAddress } from "./crypto"

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
  statement?: string
  getNonce?: () => Promise<string>
  getChainProvider?: (chain: string) => PolkadotProvider | undefined
}

const schema = {
  polkadotAccount: {
    fields: {
      userId: {
        type: "string" as const,
        required: true,
        references: {
          model: "user",
          field: "id"
        }
      },
      address: {
        type: "string" as const,
        required: true
      },
      chain: {
        type: "string" as const,
        required: true
      },
      provider: {
        type: "string" as const,
        required: true
      },
      isPrimary: {
        type: "boolean" as const,
        required: false
      },
      createdAt: {
        type: "date" as const,
        required: false
      }
    }
  }
}

export const polkadotPlugin = (options: PolkadotPluginOptions): BetterAuthPlugin => {
  const getNonceFunc = options.getNonce || (async () => generateNonce())
  const getChainProviderFunc = options.getChainProvider || ((chain: string) =>
    options.providers.find(p => p.chain === chain)
  )

  return {
    id: "polkadot",
    schema,

    onRequest: async (request, ctx) => {
      const url = new URL(request.url)

      if (url.pathname === "/api/auth/polkadot/nonce" && request.method === "POST") {
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

          const provider = getChainProviderFunc(chain)
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

          const nonce = await getNonceFunc()
          const timestamp = new Date().toISOString()

          const message = `${options.domain} wants you to sign in with your Polkadot account:
${address}

${options.statement || "Sign in with Polkadot"}

URI: https://${options.domain}
Version: 1
Chain ID: ${chain}
Nonce: ${nonce}
Issued At: ${timestamp}`

          const challenge = {
            message,
            nonce,
            address,
            chain,
            issuedAt: timestamp,
            expiresAt: new Date(Date.now() + 300000).toISOString()
          }

          const token = Buffer.from(JSON.stringify(challenge)).toString('base64url')

          return {
            response: new Response(JSON.stringify({
              nonce,
              message,
              token,
              expiresAt: challenge.expiresAt
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
          const { signature, token } = body

          if (!signature || !token) {
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

          let challenge
          try {
            const decoded = Buffer.from(token, 'base64url').toString()
            challenge = JSON.parse(decoded)
          } catch {
            return {
              response: new Response(JSON.stringify({
                error: "Invalid token",
                code: "INVALID_TOKEN"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
              })
            }
          }

          if (Date.now() > new Date(challenge.expiresAt).getTime()) {
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

          const provider = getChainProviderFunc(challenge.chain)
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

          const isValid = await verifySignature(
            challenge.message,
            signature,
            challenge.address,
            provider
          )

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

          const { address, chain } = challenge

          let userResult = await ctx.internalAdapter.findUserByEmail(
            `${address}@polkadot.${chain}`
          )

          if (!userResult) {
            userResult = await ctx.internalAdapter.createUser({
              email: `${address}@polkadot.${chain}`,
              emailVerified: true,
              name: address.slice(0, 8) + "..." + address.slice(-6)
            })
          }

          const user = userResult.user

          const existingAccount = await ctx.adapter.findOne({
            model: "polkadotAccount",
            where: [
              {
                field: "userId",
                value: user.id
              },
              {
                field: "address",
                value: address
              },
              {
                field: "chain",
                value: chain
              }
            ]
          })

          if (!existingAccount) {
            await ctx.adapter.create({
              model: "polkadotAccount",
              data: {
                userId: user.id,
                address,
                chain,
                provider: provider.id,
                isPrimary: true,
                createdAt: new Date()
              }
            })
          }

          const sessionResult = await ctx.internalAdapter.createSession(
            user.id,
            request
          )

          const sessionToken = (sessionResult as any).id || ""

          const response = new Response(JSON.stringify({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              address,
              chain
            },
            session: {
              id: sessionResult.id,
              expiresAt: sessionResult.expiresAt
            }
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": `${ctx.authCookies.sessionToken.name}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ctx.sessionConfig.expiresIn}`
            }
          })

          return { response }
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

      if (url.pathname === "/api/auth/polkadot/providers" && request.method === "GET") {
        return {
          response: new Response(JSON.stringify({
            providers: options.providers
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }
      }

      return null
    }
  }
}
import type { BetterAuthPlugin } from "better-auth"
import { createAuthEndpoint } from "better-auth/plugins"
import { z } from "zod"
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

    init: () => {
      // Plugin initialization - no modifications needed to context
      return
    },

    endpoints: {
      getNonce: createAuthEndpoint(
        "/polkadot/nonce",
        {
          method: "POST",
          body: z.object({
            address: z.string(),
            chain: z.string()
          })
        },
        async (ctx) => {
          const { address, chain } = ctx.body

          const provider = getChainProviderFunc(chain)
          if (!provider) {
            throw new Error("Unsupported chain")
          }

          if (!isValidAddress(address, provider.ss58Format)) {
            throw new Error("Invalid address format")
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
            nonce,
            message,
            token,
            expiresAt: challenge.expiresAt
          }
        }
      ),

      verify: createAuthEndpoint(
        "/polkadot/verify",
        {
          method: "POST",
          body: z.object({
            signature: z.string(),
            token: z.string()
          })
        },
        async (ctx) => {
          const { signature, token } = ctx.body

          let challenge
          try {
            const decoded = Buffer.from(token, 'base64url').toString()
            challenge = JSON.parse(decoded)
          } catch {
            throw new Error("Invalid token")
          }

          if (Date.now() > new Date(challenge.expiresAt).getTime()) {
            throw new Error("Challenge expired")
          }

          const provider = getChainProviderFunc(challenge.chain)
          if (!provider) {
            throw new Error("Provider not found")
          }

          const isValid = await verifySignature(
            challenge.message,
            signature,
            challenge.address,
            provider
          )

          if (!isValid) {
            throw new Error("Invalid signature")
          }

          const { address, chain } = challenge

          // Check if user already exists by looking for existing polkadot account
          const existingPolkadotAccount = await ctx.context.adapter.findOne({
            model: "polkadotAccount",
            where: [
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

          let user
          if (existingPolkadotAccount) {
            user = await ctx.context.adapter.findOne({
              model: "user",
              where: [
                {
                  field: "id",
                  value: (existingPolkadotAccount as any).userId
                }
              ]
            })
          }

          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              email: `${address}@polkadot.${chain}`,
              emailVerified: true,
              name: address.slice(0, 8) + "..." + address.slice(-6)
            })
          }

          const existingAccount = await ctx.context.adapter.findOne({
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
            await ctx.context.adapter.create({
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

          const sessionResult = await ctx.context.internalAdapter.createSession(
            user.id,
            ctx
          )

          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              address,
              chain
            },
            session: {
              id: sessionResult.id,
              expiresAt: sessionResult.expiresAt,
              token: sessionResult.token
            }
          }
        }
      ),

      getProviders: createAuthEndpoint(
        "/polkadot/providers",
        {
          method: "GET"
        },
        async () => {
          return {
            providers: options.providers
          }
        }
      )
    }
  }
}

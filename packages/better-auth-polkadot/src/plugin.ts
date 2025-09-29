import { BetterAuthPlugin } from "better-auth"

export interface PolkadotPluginOptions {
  providers: Array<{
    id: string
    name: string
    chain: string
    rpcUrl: string
    ss58Format: number
    decimals: number
    tokenSymbol: string
  }>
}

export const polkadotPlugin = (options: PolkadotPluginOptions): BetterAuthPlugin => {
  return {
    id: "polkadot",
    onRequest: async (request: Request, ctx: any) => {
      const url = new URL(request.url)
      
      if (url.pathname === "/api/auth/polkadot/challenge") {
        return {
          response: new Response(JSON.stringify({
            message: "Sign this message to authenticate",
            nonce: "test-nonce",
            chain: "polkadot",
            expiresAt: Date.now() + 300000
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }
      }
      
      if (url.pathname === "/api/auth/polkadot/verify") {
        return {
          response: new Response(JSON.stringify({
            user: {
              id: "test-user",
              address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
              chain: "polkadot",
              provider: "polkadot-js",
              createdAt: new Date(),
              updatedAt: new Date()
            },
            session: {
              id: "test-session",
              userId: "test-user",
              token: "test-token",
              expiresAt: new Date(Date.now() + 900000),
              createdAt: new Date()
            },
            token: "test-jwt-token"
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }
      }
    }
  }
}
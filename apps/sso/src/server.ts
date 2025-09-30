import { betterAuth } from "better-auth"
import { polkadotPlugin } from "@polkadot-sso/better-auth-polkadot"

export const auth: any = betterAuth({
  database: {
    provider: "sqlite",
    url: process.env.DATABASE_URL || "file:./data/auth.db"
  },
  secret: process.env.SESSION_SECRET || "your-secret-key-here",
  baseURL: process.env.BASE_URL || "http://localhost:3001",
  plugins: [
    polkadotPlugin({
      domain: process.env.DOMAIN || "localhost:3001",
      appName: process.env.APP_NAME || "Polkadot SSO",
      appVersion: process.env.APP_VERSION || "1.0.0",
      statement: process.env.STATEMENT || "Sign in with Polkadot to access your account",
      uri: process.env.URI || "http://localhost:3001",
      sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || "3600"),
      providers: [
        {
          id: "polkadot",
          name: "Polkadot",
          chain: "polkadot",
          rpcUrl: process.env.POLKADOT_RPC_URL || "wss://rpc.polkadot.io",
          ss58Format: 0,
          decimals: 10,
          tokenSymbol: "DOT"
        },
        {
          id: "kusama",
          name: "Kusama",
          chain: "kusama",
          rpcUrl: process.env.KUSAMA_RPC_URL || "wss://kusama-rpc.polkadot.io",
          ss58Format: 2,
          decimals: 12,
          tokenSymbol: "KSM"
        },
        {
          id: "westend",
          name: "Westend",
          chain: "westend",
          rpcUrl: process.env.WESTEND_RPC_URL || "wss://westend-rpc.polkadot.io",
          ss58Format: 42,
          decimals: 12,
          tokenSymbol: "WND"
        }
      ]
    })
  ]
})

export default auth

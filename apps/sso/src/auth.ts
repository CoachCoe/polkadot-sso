import { betterAuth } from "better-auth"
import Database from "better-sqlite3"
import { polkadotPlugin } from "@polkadot-sso/better-auth-polkadot"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, "..", "data", "auth.db")

const db = new Database(dbPath)

export const auth = betterAuth({
  database: db as any,
  secret: process.env.SESSION_SECRET || "your-secret-key-here",
  baseURL: process.env.BASE_URL || "http://localhost:3001",
  plugins: [
    polkadotPlugin({
      domain: process.env.DOMAIN || "localhost:3001",
      statement: process.env.STATEMENT || "Sign in with Polkadot to access your account",
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

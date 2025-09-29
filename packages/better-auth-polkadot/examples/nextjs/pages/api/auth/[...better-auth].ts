import { betterAuth } from "better-auth"
import { polkadotAuth } from "@polkadot-sso/better-auth-polkadot"

export const auth = betterAuth({
  plugins: [
    polkadotAuth({
      domain: process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000",
      appName: "Polkadot Auth Example",
      appVersion: "1.0.0",
      statement: "Sign in with Polkadot to access the example app",
      chainId: "polkadot",
      enableIdentityResolution: true
    })
  ]
})

export default auth.handler

import { polkadotPlugin } from "../plugin"
import type { PolkadotPluginOptions } from "../plugin"

const mockOptions: PolkadotPluginOptions = {
  domain: "localhost:3001",
  statement: "Sign in with Polkadot",
  providers: [
    {
      id: "polkadot",
      name: "Polkadot",
      chain: "polkadot",
      rpcUrl: "wss://rpc.polkadot.io",
      ss58Format: 0,
      decimals: 10,
      tokenSymbol: "DOT"
    },
    {
      id: "westend",
      name: "Westend",
      chain: "westend",
      rpcUrl: "wss://westend-rpc.polkadot.io",
      ss58Format: 42,
      decimals: 12,
      tokenSymbol: "WND"
    }
  ]
}

const mockContext = {} as any

describe("polkadotPlugin", () => {
  it("should create plugin with correct metadata", () => {
    const plugin = polkadotPlugin(mockOptions)

    expect(plugin.id).toBe("polkadot")
    expect(plugin.schema).toBeDefined()
    expect(plugin.onRequest).toBeDefined()
  })

  it("should define schema with polkadotAccount table", () => {
    const plugin = polkadotPlugin(mockOptions)

    expect(plugin.schema).toHaveProperty("polkadotAccount")
    expect(plugin.schema.polkadotAccount).toHaveProperty("fields")
    expect(plugin.schema.polkadotAccount.fields).toHaveProperty("userId")
    expect(plugin.schema.polkadotAccount.fields).toHaveProperty("address")
    expect(plugin.schema.polkadotAccount.fields).toHaveProperty("chain")
    expect(plugin.schema.polkadotAccount.fields).toHaveProperty("provider")
  })

  it("should handle nonce request", async () => {
    const plugin = polkadotPlugin(mockOptions)

    const request = new Request("http://localhost:3001/api/auth/polkadot/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        chain: "westend"
      })
    })

    const result = await plugin.onRequest?.(request, mockContext)

    expect(result).toBeDefined()
    expect(result).toHaveProperty('response')

    const response = (result as any)?.response as Response
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.message).toBeDefined()
    expect(data.nonce).toBeDefined()
    expect(data.token).toBeDefined()
  })

  it("should handle missing parameters in nonce request", async () => {
    const plugin = polkadotPlugin(mockOptions)

    const request = new Request("http://localhost:3001/api/auth/polkadot/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
      })
    })

    const result = await plugin.onRequest?.(request, mockContext)

    expect(result).toBeDefined()

    const response = (result as any)?.response as Response
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe("Missing required parameters")
    expect(data.code).toBe("MISSING_PARAMETERS")
  })

  it("should handle unsupported chain", async () => {
    const plugin = polkadotPlugin(mockOptions)

    const request = new Request("http://localhost:3001/api/auth/polkadot/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        chain: "unsupported"
      })
    })

    const result = await plugin.onRequest?.(request, mockContext)

    expect(result).toBeDefined()

    const response = (result as any)?.response as Response
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe("Unsupported chain")
    expect(data.code).toBe("UNSUPPORTED_CHAIN")
  })

  it("should handle invalid address format", async () => {
    const plugin = polkadotPlugin(mockOptions)

    const request = new Request("http://localhost:3001/api/auth/polkadot/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "invalid-address",
        chain: "polkadot"
      })
    })

    const result = await plugin.onRequest?.(request, mockContext)

    expect(result).toBeDefined()

    const response = (result as any)?.response as Response
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe("Invalid address format")
    expect(data.code).toBe("INVALID_ADDRESS")
  })

  it("should return null for non-matching paths", async () => {
    const plugin = polkadotPlugin(mockOptions)

    const request = new Request("http://localhost:3001/api/auth/other", {
      method: "POST"
    })

    const result = await plugin.onRequest?.(request, mockContext)

    expect(result).toBeNull()
  })

  it("should use custom getNonce function if provided", () => {
    const customGetNonce = jest.fn().mockResolvedValue("custom-nonce")
    const customOptions = {
      ...mockOptions,
      getNonce: customGetNonce
    }

    const plugin = polkadotPlugin(customOptions)

    expect(plugin).toBeDefined()
  })

  it("should use custom getChainProvider function if provided", () => {
    const customGetChainProvider = jest.fn().mockReturnValue(mockOptions.providers[0])
    const customOptions = {
      ...mockOptions,
      getChainProvider: customGetChainProvider
    }

    const plugin = polkadotPlugin(customOptions)

    expect(plugin).toBeDefined()
  })

  it("should handle providers endpoint", async () => {
    const plugin = polkadotPlugin(mockOptions)

    const request = new Request("http://localhost:3001/api/auth/polkadot/providers", {
      method: "GET"
    })

    const result = await plugin.onRequest?.(request, mockContext)

    expect(result).toBeDefined()

    const response = (result as any)?.response as Response
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.providers).toEqual(mockOptions.providers)
  })
})
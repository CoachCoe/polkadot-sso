import { polkadotPlugin } from "../plugin"
import type { PolkadotPluginOptions } from "../plugin"

const mockOptions: PolkadotPluginOptions = {
  providers: [
    {
      id: "polkadot",
      name: "Polkadot",
      chain: "polkadot",
      rpcUrl: "wss://rpc.polkadot.io",
      ss58Format: 0,
      decimals: 10,
      tokenSymbol: "DOT"
    }
  ],
  chains: {
    polkadot: "polkadot",
    kusama: "kusama"
  },
  rpcUrls: {
    polkadot: "wss://rpc.polkadot.io",
    kusama: "wss://kusama-rpc.polkadot.io"
  }
}

describe("polkadotPlugin", () => {
  it("should create plugin with correct metadata", () => {
    const plugin = polkadotPlugin(mockOptions)

    expect(plugin.id).toBe("polkadot")
    expect(plugin.name).toBe("Polkadot Authentication")
    expect(plugin.version).toBe("1.0.0")
  })

  it("should handle polkadot signin request", async () => {
    const plugin = polkadotPlugin(mockOptions)
    
    const mockCtx = {
      path: "/api/auth/signin/polkadot",
      method: "POST",
      body: {
        address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
        chain: "polkadot",
        message: "test message",
        signature: "0x1234567890abcdef"
      },
      headers: {},
      ip: "127.0.0.1"
    }

    const result = await plugin.onRequest?.(mockCtx)

    expect(result).toBeDefined()
    expect(result?.status).toBeDefined()
    expect(result?.body).toBeDefined()
  })

  it("should handle polkadot callback request", async () => {
    const plugin = polkadotPlugin(mockOptions)
    
    const mockCtx = {
      path: "/api/auth/callback/polkadot",
      method: "GET",
      body: {},
      headers: {},
      ip: "127.0.0.1"
    }

    const result = await plugin.onRequest?.(mockCtx)

    expect(result).toBeDefined()
    expect(result?.status).toBe(200)
    expect(result?.body.message).toBe("Polkadot callback handled")
  })

  it("should set content type for polkadot requests", async () => {
    const plugin = polkadotPlugin(mockOptions)
    
    const mockCtx = {
      path: "/api/auth/polkadot/test",
      method: "POST",
      headers: {}
    }

    await plugin.onBeforeRequest?.(mockCtx)

    expect(mockCtx.headers["Content-Type"]).toBe("application/json")
  })

  it("should audit log polkadot requests", async () => {
    const plugin = polkadotPlugin(mockOptions)
    
    const mockCtx = {
      path: "/api/auth/polkadot/test",
      method: "POST",
      status: 200,
      headers: {
        "user-agent": "test-agent"
      },
      ip: "127.0.0.1"
    }

    const consoleSpy = jest.spyOn(console, "log").mockImplementation()

    await plugin.onAfterRequest?.(mockCtx)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[AUDIT] polkadot_auth_request:"),
      expect.objectContaining({
        path: "/api/auth/polkadot/test",
        method: "POST",
        success: true
      })
    )

    consoleSpy.mockRestore()
  })

  it("should handle missing parameters", async () => {
    const plugin = polkadotPlugin(mockOptions)
    
    const mockCtx = {
      path: "/api/auth/signin/polkadot",
      method: "POST",
      body: {
        address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z"
      },
      headers: {},
      ip: "127.0.0.1"
    }

    const result = await plugin.onRequest?.(mockCtx)

    expect(result?.status).toBe(400)
    expect(result?.body.error).toBe("Missing required parameters")
    expect(result?.body.code).toBe("MISSING_PARAMETERS")
  })

  it("should handle unsupported chain", async () => {
    const plugin = polkadotPlugin(mockOptions)
    
    const mockCtx = {
      path: "/api/auth/signin/polkadot",
      method: "POST",
      body: {
        address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
        chain: "unsupported",
        message: "test message",
        signature: "0x1234567890abcdef"
      },
      headers: {},
      ip: "127.0.0.1"
    }

    const result = await plugin.onRequest?.(mockCtx)

    expect(result?.status).toBe(400)
    expect(result?.body.error).toBe("Unsupported chain")
    expect(result?.body.code).toBe("UNSUPPORTED_CHAIN")
  })
})

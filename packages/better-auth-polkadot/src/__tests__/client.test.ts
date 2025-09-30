import { PolkadotAuthClient } from "../client"

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockWeb3Enable = jest.fn()
const mockWeb3Accounts = jest.fn()
const mockWeb3FromAddress = jest.fn()

jest.mock("@polkadot/extension-dapp", () => ({
  web3Enable: mockWeb3Enable,
  web3Accounts: mockWeb3Accounts,
  web3FromAddress: mockWeb3FromAddress
}))

describe("PolkadotAuthClient", () => {
  let client: PolkadotAuthClient

  beforeEach(() => {
    client = new PolkadotAuthClient("Test App", "http://localhost:3001")
    jest.clearAllMocks()
  })

  describe("getAccounts", () => {
    it("should return accounts when wallet is available", async () => {
      const mockExtensions = [{ name: "polkadot-js" }]
      const mockAccounts = [
        {
          address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
          meta: { name: "Test Account", source: "polkadot-js" }
        }
      ]

      mockWeb3Enable.mockResolvedValue(mockExtensions)
      mockWeb3Accounts.mockResolvedValue(mockAccounts)

      const accounts = await client.getAccounts()

      expect(accounts).toHaveLength(1)
      expect(accounts[0]).toEqual({
        address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        name: "Test Account",
        source: "polkadot-js",
        chain: "westend"
      })
    })

    it("should return empty array when no extensions found", async () => {
      mockWeb3Enable.mockResolvedValue([])
      mockWeb3Accounts.mockResolvedValue([])

      const accounts = await client.getAccounts()
      expect(accounts).toEqual([])
    })

    it("should handle errors gracefully", async () => {
      mockWeb3Enable.mockRejectedValue(new Error("Extension error"))

      const accounts = await client.getAccounts()
      expect(accounts).toEqual([])
    })
  })

  describe("signMessage", () => {
    it("should sign message successfully", async () => {
      const mockSigner = {
        signRaw: jest.fn().mockResolvedValue({
          signature: "0x1234567890abcdef"
        })
      }

      mockWeb3FromAddress.mockResolvedValue({
        signer: mockSigner
      })

      const signature = await client.signMessage("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z", "test message")

      expect(signature).toBe("0x1234567890abcdef")
      expect(mockSigner.signRaw).toHaveBeenCalledWith({
        address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
        data: "test message",
        type: "bytes"
      })
    })

    it("should throw error when no signer available", async () => {
      mockWeb3FromAddress.mockResolvedValue({
        signer: null
      })

      await expect(client.signMessage("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", "test message"))
        .rejects.toThrow("No signer available")
    })
  })

  describe("authenticate", () => {
    it("should complete authentication flow", async () => {
      const mockNonceResponse = {
        message: "test challenge message",
        token: "base64-encoded-token",
        nonce: "test-nonce",
        expiresAt: new Date(Date.now() + 300000).toISOString()
      }

      const mockSigner = {
        signRaw: jest.fn().mockResolvedValue({
          signature: "0x1234567890abcdef"
        })
      }

      const mockAuthResponse = {
        user: {
          id: "user-1",
          address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
          email: "test@polkadot.polkadot",
          name: "Test User",
          chain: "polkadot"
        },
        session: {
          token: "session-token",
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockNonceResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse)
        })

      mockWeb3FromAddress.mockResolvedValue({
        signer: mockSigner
      })

      const result = await client.authenticate("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z", "polkadot")

      expect(result).toEqual(mockAuthResponse)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(1, "http://localhost:3001/api/auth/polkadot/nonce", expect.any(Object))
      expect(mockFetch).toHaveBeenNthCalledWith(2, "http://localhost:3001/api/auth/polkadot/verify", expect.objectContaining({
        credentials: 'include'
      }))
    })

    it("should handle nonce request failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(client.authenticate("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", "polkadot"))
        .rejects.toThrow("Failed to get nonce")
    })

    it("should handle signature verification failure", async () => {
      const mockNonceResponse = {
        message: "test challenge",
        token: "test-token",
        nonce: "test-nonce",
        expiresAt: new Date(Date.now() + 300000).toISOString()
      }

      const mockSigner = {
        signRaw: jest.fn().mockResolvedValue({
          signature: "0x1234567890abcdef"
        })
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockNonceResponse)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })

      mockWeb3FromAddress.mockResolvedValue({
        signer: mockSigner
      })

      await expect(client.authenticate("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", "polkadot"))
        .rejects.toThrow("Failed to verify signature")
    })
  })

  describe("detectChain", () => {
    it("should detect polkadot chain", async () => {
      const mockAccounts = [
        {
          address: "1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg",
          meta: { name: "Test", source: "polkadot-js" }
        }
      ]

      mockWeb3Enable.mockResolvedValue([{ name: "polkadot-js" }])
      mockWeb3Accounts.mockResolvedValue(mockAccounts)

      const accounts = await client.getAccounts()
      expect(accounts[0].chain).toBe("polkadot")
    })

    it("should detect kusama chain", async () => {
      const mockAccounts = [
        {
          address: "CpjsLDC1JFyrhm3ftC9Gs4QoyrkHKhZKtK7YqGTRFtTafgp",
          meta: { name: "Test", source: "polkadot-js" }
        }
      ]

      mockWeb3Enable.mockResolvedValue([{ name: "polkadot-js" }])
      mockWeb3Accounts.mockResolvedValue(mockAccounts)

      const accounts = await client.getAccounts()
      expect(accounts[0].chain).toBe("kusama")
    })

    it("should detect westend chain", async () => {
      const mockAccounts = [
        {
          address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
          meta: { name: "Test", source: "polkadot-js" }
        }
      ]

      mockWeb3Enable.mockResolvedValue([{ name: "polkadot-js" }])
      mockWeb3Accounts.mockResolvedValue(mockAccounts)

      const accounts = await client.getAccounts()
      expect(accounts[0].chain).toBe("westend")
    })
  })
})
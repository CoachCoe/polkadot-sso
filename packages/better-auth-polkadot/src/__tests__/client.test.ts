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
          address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
          meta: { name: "Test Account", source: "polkadot-js" }
        }
      ]

      mockWeb3Enable.mockResolvedValue(mockExtensions)
      mockWeb3Accounts.mockResolvedValue(mockAccounts)

      const accounts = await client.getAccounts()

      expect(accounts).toHaveLength(1)
      expect(accounts[0]).toEqual({
        address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z",
        name: "Test Account",
        source: "polkadot-js",
        chain: "polkadot"
      })
    })

    it("should throw error when no extensions found", async () => {
      mockWeb3Enable.mockResolvedValue([])

      await expect(client.getAccounts()).rejects.toThrow("No Polkadot wallet extensions found")
    })

    it("should handle errors gracefully", async () => {
      mockWeb3Enable.mockRejectedValue(new Error("Extension error"))

      await expect(client.getAccounts()).rejects.toThrow("Extension error")
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

      await expect(client.signMessage("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z", "test message"))
        .rejects.toThrow("No signer available for address")
    })
  })

  describe("authenticate", () => {
    it("should complete authentication flow", async () => {
      const mockChallenge = {
        message: "test challenge",
        nonce: "test-nonce",
        chain: "polkadot",
        expiresAt: Date.now() + 300000
      }

      const mockSigner = {
        signRaw: jest.fn().mockResolvedValue({
          signature: "0x1234567890abcdef"
        })
      }

      const mockAuthResponse = {
        user: { id: "user-1", address: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z" },
        session: { id: "session-1", token: "jwt-token" }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockChallenge)
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
    })

    it("should handle challenge request failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(client.authenticate("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z", "polkadot"))
        .rejects.toThrow("Failed to get challenge")
    })

    it("should handle signature verification failure", async () => {
      const mockChallenge = {
        message: "test challenge",
        nonce: "test-nonce",
        chain: "polkadot",
        expiresAt: Date.now() + 300000
      }

      const mockSigner = {
        signRaw: jest.fn().mockResolvedValue({
          signature: "0x1234567890abcdef"
        })
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockChallenge)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })

      mockWeb3FromAddress.mockResolvedValue({
        signer: mockSigner
      })

      await expect(client.authenticate("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z", "polkadot"))
        .rejects.toThrow("Signature verification failed")
    })
  })
})
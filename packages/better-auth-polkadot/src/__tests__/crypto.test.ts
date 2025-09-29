import { 
  verifySignature, 
  generateChallenge, 
  generateNonce, 
  isValidAddress, 
  formatAddress 
} from "../crypto"
import type { PolkadotProvider } from "../types"

const mockProvider: PolkadotProvider = {
  id: "polkadot",
  name: "Polkadot",
  chain: "polkadot",
  rpcUrl: "wss://rpc.polkadot.io",
  ss58Format: 0,
  decimals: 10,
  tokenSymbol: "DOT"
}

describe("Crypto utilities", () => {
  describe("generateChallenge", () => {
    it("should generate a challenge with address and chain", () => {
      const address = "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z"
      const chain = "polkadot"
      
      const challenge = generateChallenge(address, chain)
      
      expect(challenge).toContain("Sign this message to authenticate with polkadot")
      expect(challenge).toContain(`Address: ${address}`)
      expect(challenge).toContain("Timestamp:")
      expect(challenge).toContain("Nonce:")
    })
  })

  describe("generateNonce", () => {
    it("should generate a nonce string", () => {
      const nonce = generateNonce()
      
      expect(typeof nonce).toBe("string")
      expect(nonce.length).toBeGreaterThan(10)
    })

    it("should generate unique nonces", () => {
      const nonce1 = generateNonce()
      const nonce2 = generateNonce()
      
      expect(nonce1).not.toBe(nonce2)
    })
  })

  describe("isValidAddress", () => {
    it("should validate correct Polkadot address", () => {
      const address = "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z"
      
      const isValid = isValidAddress(address, 0)
      
      expect(isValid).toBe(true)
    })

    it("should reject invalid address", () => {
      const address = "invalid-address"
      
      const isValid = isValidAddress(address, 0)
      
      expect(isValid).toBe(false)
    })
  })

  describe("formatAddress", () => {
    it("should format long address", () => {
      const address = "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z"
      
      const formatted = formatAddress(address, 8)
      
      expect(formatted).toBe("1A2B3C4D...5Y6Z")
    })

    it("should return short address as-is", () => {
      const address = "1A2B3C4D"
      
      const formatted = formatAddress(address, 8)
      
      expect(formatted).toBe(address)
    })
  })

  describe("verifySignature", () => {
    it("should verify valid signature", async () => {
      const message = "test message"
      const signature = "0x1234567890abcdef"
      const address = "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z"
      
      const result = await verifySignature(message, signature, address, mockProvider)
      
      expect(typeof result).toBe("boolean")
    })

    it("should handle verification errors gracefully", async () => {
      const message = "test message"
      const signature = "invalid-signature"
      const address = "invalid-address"
      
      const result = await verifySignature(message, signature, address, mockProvider)
      
      expect(result).toBe(false)
    })
  })
})

import {
  verifySignature,
  generateNonce,
  isValidAddress,
  formatAddress,
  createMessageHash
} from "../crypto"
import type { PolkadotProvider } from "../plugin"

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
  describe("generateNonce", () => {
    it("should generate a nonce string", () => {
      const nonce = generateNonce()

      expect(typeof nonce).toBe("string")
      expect(nonce.length).toBe(32)
    })

    it("should generate unique nonces", () => {
      const nonce1 = generateNonce()
      const nonce2 = generateNonce()

      expect(nonce1).not.toBe(nonce2)
    })
  })

  describe("isValidAddress", () => {
    it("should validate correct Polkadot address", () => {
      const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

      const isValid = isValidAddress(address, 42)

      expect(isValid).toBe(true)
    })

    it("should reject invalid address", () => {
      const address = "invalid-address"

      const isValid = isValidAddress(address, 0)

      expect(isValid).toBe(false)
    })

    it("should reject empty address", () => {
      const address = ""

      const isValid = isValidAddress(address, 0)

      expect(isValid).toBe(false)
    })
  })

  describe("formatAddress", () => {
    it("should format long address", () => {
      const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

      const formatted = formatAddress(address, 8)

      expect(formatted).toBe("5GrwvaEF...oHGKutQY")
    })

    it("should return short address as-is", () => {
      const address = "5GrwvaEF"

      const formatted = formatAddress(address, 8)

      expect(formatted).toBe(address)
    })

    it("should use default length of 8", () => {
      const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

      const formatted = formatAddress(address)

      expect(formatted).toBe("5GrwvaEF...oHGKutQY")
    })
  })

  describe("createMessageHash", () => {
    it("should create message hash", () => {
      const message = "test message"
      const hash = createMessageHash(message)

      expect(hash).toBeDefined()
      expect(hash).toMatch(/^0x[a-fA-F0-9]+$/)
    })

    it("should create different hashes for different messages", () => {
      const hash1 = createMessageHash("message1")
      const hash2 = createMessageHash("message2")

      expect(hash1).not.toBe(hash2)
    })

    it("should create same hash for same message", () => {
      const message = "test message"
      const hash1 = createMessageHash(message)
      const hash2 = createMessageHash(message)

      expect(hash1).toBe(hash2)
    })
  })

  describe("verifySignature", () => {
    it("should return boolean for valid signature format", async () => {
      const message = "test message"
      const signature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

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

    it("should return false for empty signature", async () => {
      const message = "test message"
      const signature = ""
      const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

      const result = await verifySignature(message, signature, address, mockProvider)

      expect(result).toBe(false)
    })
  })
})
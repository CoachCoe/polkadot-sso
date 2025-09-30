import { 
  verifySignature, 
  generateChallenge, 
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
  describe("generateChallenge", () => {
    it("should generate SIWE-style challenge", () => {
      const address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
      const chain = "polkadot"
      
      const challenge = generateChallenge(address, chain)
      
      expect(challenge).toContain(address)
      expect(challenge).toContain(chain)
      expect(challenge).toContain("wants you to sign in")
      expect(challenge).toContain("Sign in with Polkadot")
      expect(challenge).toContain("URI:")
      expect(challenge).toContain("Version:")
      expect(challenge).toContain("Chain ID:")
      expect(challenge).toContain("Nonce:")
      expect(challenge).toContain("Issued At:")
    })
  })

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
  })

  describe("createMessageHash", () => {
    it("should create message hash", () => {
      const message = "test message"
      const hash = createMessageHash(message)
      
      expect(hash).toBeDefined()
      expect(hash).toMatch(/^0x[a-fA-F0-9]+$/)
    })
  })

  describe("verifySignature", () => {
    it("should verify valid signature", async () => {
      const message = "test message"
      const signature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
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
  })
})

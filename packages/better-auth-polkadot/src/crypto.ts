import { u8aToHex, hexToU8a } from "@polkadot/util"
import { signatureVerify } from "@polkadot/util-crypto"
import type { PolkadotProvider } from "./types"

export async function verifySignature(
  message: string,
  signature: string,
  address: string,
  provider: PolkadotProvider
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = hexToU8a(signature)
    
    const result = signatureVerify(messageBytes, signatureBytes, address)
    
    return result.isValid
  } catch (error) {
    console.error("Signature verification failed:", error)
    return false
  }
}

export function generateChallenge(address: string, chain: string): string {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).substring(2, 15)
  
  return `Sign this message to authenticate with ${chain}:\n\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function isValidAddress(address: string, ss58Format: number): boolean {
  try {
    const { decodeAddress } = require("@polkadot/util-crypto")
    decodeAddress(address, false, ss58Format)
    return true
  } catch {
    return false
  }
}

export function formatAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) {
    return address
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

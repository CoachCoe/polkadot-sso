import { u8aToHex, hexToU8a } from "@polkadot/util"
import { signatureVerify, decodeAddress, cryptoWaitReady } from "@polkadot/util-crypto"
import { randomBytes } from "crypto"
import type { PolkadotProvider } from "./plugin"

export async function verifySignature(
  message: string,
  signature: string,
  address: string,
  provider: PolkadotProvider
): Promise<boolean> {
  try {
    await cryptoWaitReady()

    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = hexToU8a(signature)

    const result = signatureVerify(messageBytes, signatureBytes, address)

    return result.isValid
  } catch (error) {
    console.error("Signature verification failed:", error)
    return false
  }
}


export function generateNonce(): string {
  return randomBytes(16).toString('hex')
}

export function isValidAddress(address: string, ss58Format: number): boolean {
  try {
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

export function createMessageHash(message: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  return u8aToHex(data)
}

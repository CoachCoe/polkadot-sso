<template>
  <UCard class="max-w-md w-full">
    <template #header>
      <h2 class="text-2xl font-bold text-center">
        Polkadot Authentication
      </h2>
    </template>

    <div class="space-y-4">
      <!-- User Authenticated -->
      <div v-if="user" class="text-center">
        <div class="text-4xl mb-4">🟣</div>
        <h3 class="text-lg font-semibold mb-2">Welcome!</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Address: {{ formatAddress(user.address) }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Chain: {{ user.chain }}
        </p>
        <UButton 
          block 
          color="red" 
          @click="handleSignOut"
          :loading="loading"
        >
          Sign Out
        </UButton>
      </div>

      <!-- Account Selection -->
      <div v-else-if="accounts.length > 0" class="space-y-4">
        <h3 class="text-lg font-semibold">Select Account</h3>
        <div class="space-y-2">
          <div 
            v-for="account in accounts" 
            :key="account.address"
            class="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            :class="{ 'border-blue-500 bg-blue-50 dark:bg-blue-900/20': selectedAccount?.address === account.address }"
            @click="selectedAccount = account"
          >
            <div class="font-medium">{{ account.name || 'Unnamed Account' }}</div>
            <div class="text-sm text-gray-500">{{ formatAddress(account.address) }}</div>
            <div class="text-xs text-gray-400">{{ account.chain }}</div>
          </div>
        </div>
        
        <UButton 
          block 
          size="lg"
          :disabled="!selectedAccount || loading"
          @click="handleSignIn"
          :loading="loading"
        >
          Sign In with {{ selectedAccount?.name || 'Selected Account' }}
        </UButton>
      </div>

      <!-- Connect Wallet -->
      <div v-else class="text-center">
        <div class="text-4xl mb-4">🟣</div>
        <h3 class="text-lg font-semibold mb-2">Connect Polkadot Wallet</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your Polkadot.js wallet to authenticate
        </p>
        <UButton 
          block 
          size="lg"
          @click="handleConnectWallet"
          :loading="loading"
        >
          Connect Wallet
        </UButton>
      </div>

      <!-- Error Display -->
      <UAlert v-if="error" color="red" variant="soft" :title="error" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface PolkadotAccount {
  address: string
  name?: string
  source: string
  chain: string
}

interface PolkadotUser {
  id: string
  address: string
  chain: string
  provider: string
  createdAt: Date
  updatedAt: Date
}

const accounts = ref<PolkadotAccount[]>([])
const user = ref<PolkadotUser | null>(null)
const selectedAccount = ref<PolkadotAccount | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const config = useRuntimeConfig()
const ssoUrl = config.public.ssoServerUrl || 'http://localhost:3001'

const formatAddress = (address: string, length: number = 8): string => {
  if (address.length <= length * 2) {
    return address
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

const handleConnectWallet = async () => {
  loading.value = true
  error.value = null

  try {
    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
    
    const extensions = await web3Enable('Polkadot SSO Example')
    
    if (extensions.length === 0) {
      throw new Error('No Polkadot wallet extensions found. Please install Polkadot.js extension.')
    }

    const walletAccounts = await web3Accounts()
    
    accounts.value = walletAccounts.map(account => ({
      address: account.address,
      name: account.meta.name,
      source: account.meta.source,
      chain: detectChain(account.address)
    }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to connect wallet'
  } finally {
    loading.value = false
  }
}

const handleSignIn = async () => {
  if (!selectedAccount.value) return

  loading.value = true
  error.value = null

  try {
    const { web3FromAddress } = await import('@polkadot/extension-dapp')
    
    const challenge = await getChallenge(selectedAccount.value.address, selectedAccount.value.chain)
    const injector = await web3FromAddress(selectedAccount.value.address)
    
    if (!injector.signer) {
      throw new Error('No signer available for address')
    }

    const signature = await injector.signer.signRaw({
      address: selectedAccount.value.address,
      data: challenge.message,
      type: 'bytes'
    })

    const authResult = await verifySignature({
      signature: signature.signature,
      token: challenge.token
    })

    user.value = authResult.user
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed'
  } finally {
    loading.value = false
  }
}

const handleSignOut = async () => {
  loading.value = true
  error.value = null

  try {
    if (user.value) {
      await fetch(`${ssoUrl}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
    
    user.value = null
    selectedAccount.value = null
    accounts.value = []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign out failed'
  } finally {
    loading.value = false
  }
}

const getChallenge = async (address: string, chain: string) => {
  const response = await fetch(`${ssoUrl}/api/auth/polkadot/nonce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ address, chain })
  })

  if (!response.ok) {
    throw new Error('Failed to get challenge')
  }

  return response.json()
}

const verifySignature = async (signature: any) => {
  const response = await fetch(`${ssoUrl}/api/auth/polkadot/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signature)
  })

  if (!response.ok) {
    throw new Error('Signature verification failed')
  }

  return response.json()
}

const detectChain = (address: string): string => {
  if (address.startsWith('1')) return 'polkadot'
  if (address.startsWith('C')) return 'kusama'
  if (address.startsWith('5')) return 'westend'
  return 'unknown'
}

onMounted(() => {
  // Check for existing session
  checkSession()
})

const checkSession = async () => {
  try {
    const response = await fetch(`${ssoUrl}/api/auth/session`, {
      credentials: 'include'
    })

    if (response.ok) {
      const sessionData = await response.json()
      if (sessionData.user) {
        user.value = sessionData.user
      }
    }
  } catch (err) {
    // Session check failed, user needs to authenticate
  }
}
</script>

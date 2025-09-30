<template>
  <UCard class="max-w-md w-full">
    <template #header>
      <h2 class="text-2xl font-bold text-center">
        Sign In
      </h2>
    </template>

    <div class="space-y-4">
      <!-- Authentication Method Selection -->
      <div v-if="!selectedAuthMethod">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose your preferred authentication method
        </p>
        <div class="grid grid-cols-1 gap-3">
          <UButton
            block
            size="lg"
            variant="outline"
            class="justify-start"
            @click="selectAuthMethod('polkadot')"
          >
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🟣</span>
              <div class="text-left">
                <div class="font-medium">Polkadot.js Wallet</div>
                <div class="text-xs text-gray-500">Sign with your blockchain wallet</div>
              </div>
            </div>
          </UButton>
          
          <UButton
            block
            size="lg"
            variant="outline"
            class="justify-start"
            @click="selectAuthMethod('telegram')"
          >
            <div class="flex items-center space-x-3">
              <span class="text-2xl">📱</span>
              <div class="text-left">
                <div class="font-medium">Telegram</div>
                <div class="text-xs text-gray-500">Authenticate with Telegram</div>
              </div>
            </div>
          </UButton>
          
          <UButton
            block
            size="lg"
            variant="outline"
            class="justify-start"
            @click="selectAuthMethod('google')"
          >
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🔍</span>
              <div class="text-left">
                <div class="font-medium">Google</div>
                <div class="text-xs text-gray-500">Sign in with Google</div>
              </div>
            </div>
          </UButton>
          
          <UButton
            block
            size="lg"
            variant="outline"
            class="justify-start"
            @click="selectAuthMethod('github')"
          >
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🐙</span>
              <div class="text-left">
                <div class="font-medium">GitHub</div>
                <div class="text-xs text-gray-500">Sign in with GitHub</div>
              </div>
            </div>
          </UButton>
        </div>
      </div>

      <!-- Wallet Connection (Polkadot only) -->
      <div v-else-if="selectedAuthMethod === 'polkadot' && !walletConnected">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your Polkadot wallet to get started
        </p>
        <UButton
          block
          size="lg"
          :loading="loading"
          :disabled="loading"
          class="bg-[var(--color-polkadot-pink)] hover:bg-[#e6245f] text-white"
          @click="handleConnectWallet"
        >
          Connect Wallet
        </UButton>
        <UButton
          variant="soft"
          color="gray"
          block
          @click="selectedAuthMethod = null"
        >
          Back to Auth Methods
        </UButton>
      </div>

      <!-- Account Selection (Polkadot only) -->
      <div v-else-if="selectedAuthMethod === 'polkadot' && accounts.length > 0 && !selectedAccount" class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Select an account to sign in with:
        </p>
        <div class="space-y-2">
          <button
            v-for="account in accounts"
            :key="account.address"
            class="w-full p-3 text-left border rounded-lg hover:border-[var(--color-polkadot-pink)] hover:bg-pink-50 dark:hover:bg-pink-950/10 transition-all"
            @click="selectAccount(account)"
          >
            <div class="font-medium">
              {{ account.meta.name || 'Unnamed Account' }}
            </div>
            <div class="text-sm text-gray-500 font-mono">
              {{ formatAddress(account.address) }}
            </div>
          </button>
        </div>
      </div>

      <!-- Chain Selection and Sign In (Polkadot only) -->
      <div v-else-if="selectedAuthMethod === 'polkadot' && selectedAccount" class="space-y-4">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Selected Account:
          </p>
          <div class="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div class="font-medium">
              {{ selectedAccount.meta.name || 'Unnamed Account' }}
            </div>
            <div class="text-sm text-gray-500 font-mono">
              {{ formatAddress(selectedAccount.address) }}
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">
            Select Chain
          </label>
          <USelect
            v-model="selectedChain"
            :items="chainOptions"
            class="w-full"
          />
        </div>

        <div class="space-y-2">
          <UButton
            block
            size="lg"
            class="bg-[var(--color-polkadot-pink)] hover:bg-[#e6245f] text-white"
            @click="handleSignIn"
          >
            Continue with Polkadot
          </UButton>
          <UButton
            variant="soft"
            color="gray"
            block
            @click="handleBack"
          >
            Back
          </UButton>
        </div>
      </div>

      <!-- Non-Polkadot Authentication -->
      <div v-else-if="selectedAuthMethod && selectedAuthMethod !== 'polkadot'" class="space-y-4">
        <div class="text-center">
          <div class="text-4xl mb-4">
            {{ selectedAuthMethod === 'telegram' ? '📱' : selectedAuthMethod === 'google' ? '🔍' : '🐙' }}
          </div>
          <h3 class="text-lg font-semibold mb-2">
            {{ selectedAuthMethod === 'telegram' ? 'Telegram Authentication' : 
               selectedAuthMethod === 'google' ? 'Google Authentication' : 'GitHub Authentication' }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {{ selectedAuthMethod === 'telegram' ? 'You will be redirected to authenticate with Telegram' :
               selectedAuthMethod === 'google' ? 'You will be redirected to authenticate with Google' :
               'You will be redirected to authenticate with GitHub' }}
          </p>
        </div>
        
        <div class="space-y-2">
          <UButton
            block
            size="lg"
            :class="getAuthButtonClass(selectedAuthMethod)"
            @click="handleNonPolkadotAuth"
          >
            Continue with {{ getAuthMethodName(selectedAuthMethod) }}
          </UButton>
          <UButton
            variant="soft"
            color="gray"
            block
            @click="selectedAuthMethod = null"
          >
            Back to Auth Methods
          </UButton>
        </div>
      </div>

      <!-- Error Display -->
      <UAlert
        v-if="error || authError"
        color="red"
        variant="soft"
        :title="error || authError"
      />

      <!-- No Accounts Message (Polkadot only) -->
      <div v-if="selectedAuthMethod === 'polkadot' && walletConnected && accounts.length === 0" class="text-center py-4">
        <p class="text-gray-600 dark:text-gray-400">
          No accounts found. Please create an account in your wallet.
        </p>
        <UButton
          variant="outline"
          size="sm"
          class="mt-2"
          @click="handleConnectWallet"
        >
          Refresh
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

const router = useRouter()
const authStore = useAuthStore()
const wallet = useWallet()

const {
  accounts,
  selectedAccount,
  loading,
  error,
  walletConnected,
  connectWallet,
  selectAccount
} = wallet

const { error: authError } = storeToRefs(authStore)

const selectedAuthMethod = ref<string | null>(null)
const selectedChain = ref('kusama')

const chainOptions = [
  { label: 'Kusama', value: 'kusama' },
  { label: 'Polkadot', value: 'polkadot' },
  { label: 'Westend', value: 'westend' }
]

const formatAddress = (address: string) => {
  if (address.length <= 20) return address
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

const handleConnectWallet = async () => {
  await connectWallet()
}

const handleSignIn = () => {
  if (!selectedAccount.value) return

  // Store selected account info for later use
  if (import.meta.client) {
    sessionStorage.setItem('selectedAccount', JSON.stringify({
      address: selectedAccount.value.address,
      source: selectedAccount.value.meta.source,
      chain: selectedChain.value
    }))
  }

  // Redirect to SSO server for authentication
  const config = useRuntimeConfig()
  const ssoUrl = config.public.ssoServerUrl
  const clientId = config.public.ssoClientId
  const redirectUrl = config.public.ssoRedirectUrl

  const params = new URLSearchParams({
    client_id: clientId,
    address: selectedAccount.value.address,
    chain: selectedChain.value,
    redirect_uri: redirectUrl
  })

  // Redirect to SSO server
  window.location.href = `${ssoUrl}/api/auth/challenge?${params.toString()}`
}

const handleBack = () => {
  selectAccount(null as any)
}

const selectAuthMethod = (method: string) => {
  selectedAuthMethod.value = method
  if (method === 'polkadot') {
    handleConnectWallet()
  }
}

const getAuthMethodName = (method: string) => {
  switch (method) {
    case 'telegram': return 'Telegram'
    case 'google': return 'Google'
    case 'github': return 'GitHub'
    default: return method
  }
}

const getAuthButtonClass = (method: string) => {
  switch (method) {
    case 'telegram': return 'bg-blue-500 hover:bg-blue-600 text-white'
    case 'google': return 'bg-red-500 hover:bg-red-600 text-white'
    case 'github': return 'bg-gray-800 hover:bg-gray-900 text-white'
    default: return 'bg-gray-500 hover:bg-gray-600 text-white'
  }
}

const handleNonPolkadotAuth = () => {
  if (!selectedAuthMethod.value) return

  const config = useRuntimeConfig()
  const ssoUrl = config.public.ssoServerUrl
  const clientId = config.public.ssoClientId

  let authUrl = ''
  switch (selectedAuthMethod.value) {
    case 'telegram':
      authUrl = `${ssoUrl}/api/auth/telegram/challenge?client_id=${clientId}`
      break
    case 'google':
      authUrl = `${ssoUrl}/api/auth/google/challenge?client_id=${clientId}`
      break
    case 'github':
      authUrl = `${ssoUrl}/api/auth/github/challenge?client_id=${clientId}`
      break
  }

  if (authUrl) {
    window.location.href = authUrl
  }
}

// Auto-connect wallet on mount only if no auth method is selected
onMounted(() => {
  // Don't auto-connect wallet, let user choose auth method first
})
</script>
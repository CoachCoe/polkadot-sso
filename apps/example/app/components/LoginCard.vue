<template>
  <UCard class="max-w-md w-full">
    <template #header>
      <h2 class="text-2xl font-bold text-center">
        Sign In
      </h2>
    </template>

    <div class="space-y-4">
      <!-- Wallet Connection -->
      <div v-if="!walletConnected">
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
      </div>

      <!-- Account Selection -->
      <div v-else-if="accounts.length > 0 && !selectedAccount" class="space-y-4">
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

      <!-- Chain Selection and Sign In -->
      <div v-else-if="selectedAccount" class="space-y-4">
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

      <!-- Error Display -->
      <UAlert
        v-if="error || authError"
        color="red"
        variant="soft"
        :title="error || authError"
      />

      <!-- No Accounts Message -->
      <div v-if="walletConnected && accounts.length === 0" class="text-center py-4">
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

// Auto-connect wallet on mount
onMounted(() => {
  handleConnectWallet()
})
</script>
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

export const useWallet = () => {
  const accounts = ref<InjectedAccountWithMeta[]>([])
  const selectedAccount = ref<InjectedAccountWithMeta | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const walletConnected = ref(false)

  // Connect to wallet extensions
  const connectWallet = async () => {
    if (!import.meta.client) {
      return false
    }

    try {
      loading.value = true
      error.value = null

      // Dynamically import to avoid SSR issues
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

      // Enable wallet extensions
      const extensions = await web3Enable('Polkadot SSO Demo')

      if (extensions.length === 0) {
        error.value = 'No wallet extension found. Please install Polkadot.js or compatible wallet.'
        return false
      }

      // Get all accounts
      const allAccounts = await web3Accounts()

      if (allAccounts.length === 0) {
        error.value = 'No accounts found. Please create an account in your wallet.'
        return false
      }

      accounts.value = allAccounts
      walletConnected.value = true
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect wallet'
      return false
    } finally {
      loading.value = false
    }
  }


  // Select account
  const selectAccount = (account: InjectedAccountWithMeta) => {
    selectedAccount.value = account
  }

  // Check if wallet is available
  const checkWalletAvailable = async () => {
    if (!import.meta.client) {
      return false
    }

    try {
      const { web3Enable } = await import('@polkadot/extension-dapp')
      const extensions = await web3Enable('Polkadot SSO Demo')
      return extensions.length > 0
    } catch {
      return false
    }
  }

  return {
    // State
    accounts: readonly(accounts),
    selectedAccount: readonly(selectedAccount),
    loading: readonly(loading),
    error: readonly(error),
    walletConnected: readonly(walletConnected),

    // Actions
    connectWallet,
    selectAccount,
    checkWalletAvailable
  }
}
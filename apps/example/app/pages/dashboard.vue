<template>
  <div class="min-h-screen bg-[var(--color-polkadot-pink)]">
    <UContainer class="py-8">
      <!-- Polkadot Logo -->
      <div class="mb-8 flex justify-center">
        <img
          src="/polkadot-all-white.svg"
          alt="Polkadot"
          class="h-12 w-auto"
        />
      </div>

    <div class="grid gap-6">
      <!-- Session Info Card -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Session Information</h2>
        </template>

        <div v-if="session" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Chain</label>
              <p class="capitalize">{{ session.user.chain }}</p>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-500">Address</label>
              <p class="font-mono text-sm truncate">{{ session.user.address }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Wallet</label>
              <p class="capitalize">{{ session.user.wallet }}</p>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-500">Session Expires</label>
              <p>{{ formatDate(session.expiresAt) }}</p>
            </div>
          </div>

          <USeparator class="my-4" />

          <div>
            <label class="text-sm font-medium text-gray-500">Access Token</label>
            <div class="mt-1 relative">
              <code class="block p-2 pr-10 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
                {{ tokens.accessToken || 'Not available' }}
              </code>
              <UButton
                v-if="tokens.accessToken"
                icon="i-lucide-copy"
                size="xs"
                variant="ghost"
                color="neutral"
                class="absolute top-1 right-1"
                @click="copyToClipboard(tokens.accessToken, 'Access token')"
              />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-gray-500">Refresh Token</label>
            <div class="mt-1 relative">
              <code class="block p-2 pr-10 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
                {{ tokens.refreshToken || 'Not available' }}
              </code>
              <UButton
                v-if="tokens.refreshToken"
                icon="i-lucide-copy"
                size="xs"
                variant="ghost"
                color="neutral"
                class="absolute top-1 right-1"
                @click="copyToClipboard(tokens.refreshToken, 'Refresh token')"
              />
            </div>
          </div>

          <USeparator class="my-4" />

          <div class="flex justify-center">
            <UButton
              variant="solid"
              size="md"
              @click="handleSignOut"
              class="px-6 bg-[var(--color-polkadot-pink)] hover:bg-[#E0215D] text-white"
            >
              <template #leading>
                <UIcon name="i-lucide-log-out" />
              </template>
              Sign Out
            </UButton>
          </div>
        </div>

        <div v-else class="text-gray-500">
          No session data available
        </div>
      </UCard>
    </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'
import { useAuthService } from '~/services/authService'

// Protect this route
definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const authService = useAuthService()
const router = useRouter()

const { session } = storeToRefs(authStore)
const toast = useToast()

const tokens = computed(() => {
  return authService.getStoredTokens()
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const handleSignOut = async () => {
  await authStore.signOut()
  await router.push('/')
}

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
      color: 'green'
    })
  } catch (err) {
    toast.add({
      title: 'Failed to copy',
      description: 'Please try again',
      color: 'red'
    })
  }
}
</script>
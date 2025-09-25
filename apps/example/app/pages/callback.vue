<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--color-polkadot-pink)]">
    <UCard class="max-w-md w-full">
      <template #header>
        <h2 class="text-xl font-semibold text-center">Processing Authentication</h2>
      </template>

      <div class="text-center space-y-4">
        <div v-if="processing">
          <USkeleton class="h-12 w-12 rounded-full mx-auto mb-4" />
          <p class="text-gray-600 dark:text-gray-400">
            Exchanging authorization code for tokens...
          </p>
        </div>

        <div v-else-if="error">
          <UAlert
            color="red"
            variant="soft"
            :title="error"
          />
          <UButton
            class="mt-4"
            variant="outline"
            @click="router.push('/')"
          >
            Back to Login
          </UButton>
        </div>

        <div v-else-if="success">
          <div class="text-green-500 text-4xl mb-4">✓</div>
          <p class="text-gray-600 dark:text-gray-400">
            Authentication successful! Redirecting to dashboard...
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useAuthService } from '~/services/authService'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const authService = useAuthService()

const processing = ref(true)
const error = ref<string | null>(null)
const success = ref(false)

onMounted(async () => {
  const { code, state, error: queryError } = route.query

  if (queryError) {
    error.value = queryError as string
    processing.value = false
    return
  }

  if (!code || !state) {
    error.value = 'Missing authorization code or state'
    processing.value = false
    return
  }

  try {
    // Exchange code for tokens
    const result = await authService.exchangeCodeForTokens(code as string)

    if (result.success) {
      success.value = true

      // Force the auth store to check authentication
      await authStore.checkAuth(true)

      // Navigate to home first, which will redirect to dashboard if authenticated
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      error.value = 'Failed to exchange authorization code'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authentication failed'
  } finally {
    processing.value = false
  }
})

definePageMeta({
  layout: false
})
</script>
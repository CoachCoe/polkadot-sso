<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <nav class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Polkadot SSO Demo
            </h1>
          </div>

          <div class="flex items-center space-x-4">
            <template v-if="isAuthenticated && session">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatAddress(session.user.address) }}
              </div>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                @click="handleSignOut"
              >
                Sign Out
              </UButton>
            </template>
            <template v-else>
              <NuxtLink to="/login">
                <UButton color="primary" size="sm">
                  Sign In
                </UButton>
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

const { session, isAuthenticated } = storeToRefs(authStore)

const formatAddress = (address: string) => {
  if (address.length <= 16) return address
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

const handleSignOut = async () => {
  await authStore.signOut()
  await router.push('/login')
}
</script>
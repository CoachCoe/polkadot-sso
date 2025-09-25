<template>
  <div class="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--color-polkadot-pink)]">
    <!-- Polkadot Logo -->
    <div class="mb-8">
      <img
        src="/polkadot-all-white.svg"
        alt="Polkadot"
        class="h-12 w-auto"
      />
    </div>

    <!-- Login Card -->
    <LoginCard />
  </div>
</template>

<script setup lang="ts">
// Apply guest middleware - redirects to dashboard if already authenticated
definePageMeta({
  middleware: 'guest'
})

// Redirect if already authenticated
const authStore = useAuthStore()

// Check auth on mount
onMounted(() => {
  authStore.checkAuth()
})
</script>
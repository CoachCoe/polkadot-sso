<script setup lang="ts">
// Initialize auth on app mount
const authStore = useAuthStore()

// Check auth only on client side after mount
onMounted(async () => {
  // Small delay to ensure localStorage is accessible
  await nextTick()
  await authStore.checkAuth()
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Polkadot SSO Demo'
const description = 'A demonstration of wallet-based authentication for the Polkadot ecosystem using Nuxt and Vue'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>

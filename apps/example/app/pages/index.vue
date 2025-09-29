<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Polkadot SSO
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Secure authentication for the Polkadot ecosystem
        </p>
      </div>
      
      <PolkadotAuth />
      
      <div class="mt-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Powered by Better Auth & Polkadot.js
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PolkadotAuth from '~/components/PolkadotAuth.vue'

useHead({
  title: 'Polkadot SSO - Secure Authentication',
  meta: [
    { name: 'description', content: 'Secure authentication for the Polkadot ecosystem using Better Auth' }
  ]
})
</script>
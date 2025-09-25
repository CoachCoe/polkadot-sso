// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['@nuxt/ui', 'nuxt-llms', '@nuxthub/core'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  ogImage: {
    enabled: false
  },
  site: {
    name: 'Polkadot Auth',
  },
  llms: {
    domain: process.env.NUXT_PUBLIC_SITE_URL || 'https://dotsso-docs.nuxt.dev',
    title: 'Polkadot Auth',
    description: 'A simple, secure, and open-source authentication solution for Polkadot',
    full: {
      title: 'Polkadot Auth',
      description: 'A simple, secure, and open-source authentication solution for Polkadot'
    }
  },
  fonts: {
    families: [
      {
        name: 'Unbounded',
        provider: 'google',
        weights: [200, 300, 400, 500, 600, 700, 800, 900]
      },
      {
        name: 'Inter',
        provider: 'google',
        weights: [100, 200, 300, 400, 500, 600, 700, 800, 900]
      }
    ]
  },
  hub: {
    database: false,
    analytics: false,
    blob: false,
    cache: false,
    kv: false,
    remote: false,
  }
})

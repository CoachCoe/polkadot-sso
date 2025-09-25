// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-09-11',
  extends: ['docus'],
  modules: ['@nuxt/ui-pro', '@nuxtjs/seo', '@nuxt/content', 'nuxt-llms', '@nuxthub/core'],
  devtools: { enabled: false },
  ogImage: {
    enabled: false
  },
  site: {
    name: '',
  },
  llms: {
    domain: '',
    title: '',
    description: '',
    full: {
      title: '',
      description: ''
    }
  },
  hub: {
    database: true,
    analytics: false,
    blob: false,
    cache: false,
    kv: false,
    remote: false,
  }
})

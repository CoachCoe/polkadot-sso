// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  runtimeConfig: {
    public: {
      ssoServerUrl: process.env.NUXT_PUBLIC_SSO_SERVER_URL || 'http://localhost:3001',
      ssoClientId: process.env.NUXT_PUBLIC_SSO_CLIENT_ID || 'demo-client',
      ssoClientSecret: process.env.NUXT_PUBLIC_SSO_CLIENT_SECRET || 'default-client-secret-for-development-only',
      ssoRedirectUrl: process.env.NUXT_PUBLIC_SSO_REDIRECT_URL || 'http://localhost:3000/callback',
      defaultChain: process.env.NUXT_PUBLIC_DEFAULT_CHAIN || 'westend'
    }
  }
})

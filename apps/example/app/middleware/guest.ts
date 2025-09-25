export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()

  // Wait for auth to be initialized on client side
  if (import.meta.client && !authStore.initialized) {
    await authStore.checkAuth()
  }

  // If user is already authenticated, redirect to dashboard
  if (authStore.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
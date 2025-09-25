export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()

  // Wait for auth to be initialized on client side
  if (import.meta.client && !authStore.initialized) {
    await authStore.checkAuth()
  }

  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    // Redirect to index page (login)
    return navigateTo('/')
  }
})
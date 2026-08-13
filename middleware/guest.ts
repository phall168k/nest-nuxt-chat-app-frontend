export default defineNuxtRouteMiddleware(() => {
  const accessToken = useCookie<string | null>('token')

  if (accessToken.value) {
    return navigateTo('/')
  }
})

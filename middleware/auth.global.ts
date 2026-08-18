export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie<string | null>('token')

  // Signed-out users may access authentication pages. Signed-in users go home.
  if (to.path.startsWith('/auth/')) {
    return accessToken.value ? navigateTo('/') : undefined
  }

  if (accessToken.value) return

  return navigateTo({
    path: '/auth/sign-in',
    query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
  })
})

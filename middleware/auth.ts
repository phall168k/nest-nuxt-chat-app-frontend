export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie<string | null>('token')

  if (!accessToken.value) {
    return navigateTo({
      path: '/auth/sign-in',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    })
  }
})

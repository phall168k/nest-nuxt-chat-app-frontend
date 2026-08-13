import type { FetchOptions } from 'ofetch'

export interface ApiErrorData {
  message?: string | string[]
  error?: string
}

export type ApiOptions = Omit<FetchOptions, 'baseURL'>

export const useApi = async <T>(
  url: string,
  options: ApiOptions = {},
  authOnly: boolean = true
): Promise<T> => {
  const accessToken = useCookie<string | null>('token')
  const config = useRuntimeConfig()
  const headers = new Headers(options.headers as HeadersInit | undefined)

  if (accessToken.value) {
    headers.set('Authorization', `Bearer ${accessToken.value}`)
  }

  try {
    return await $fetch<T>(url, {
      baseURL: config.public.apiBaseUrl,
      ...options,
      headers,
    })
  } catch (error: any) {
    const status = error?.statusCode ?? error?.status

    if (authOnly && status === 401) {
      accessToken.value = null
      await navigateTo('/auth/sign-in')
    }
    if (authOnly && status === 403) {
      await navigateTo('/403')
    }

    throw error
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxt/icon',
    '@element-plus/nuxt',
  ],
  i18n: {
    locales: [
      {
        code: 'en',
        file: 'en.json',
        language: 'en-US',
      },
      {
        code: 'km',
        file: 'km.json',
        language: 'KM',
      },
    ],
    defaultLocale: 'en',
    langDir: 'locales/',
    strategy: 'no_prefix',
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.API_BASE_URL,
      socketUrl: process.env.SOCKET_URL,
    }
  }
})

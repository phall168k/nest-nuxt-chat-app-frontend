<script setup lang="ts">
import { storeToRefs } from 'pinia'

const auth = useCookie<any>('auth');

const route = useRoute()
const collapseStore = useCollapseStore()
const { isCollapsed } = storeToRefs(collapseStore)
const handleToggleCollapse = () => {
  collapseStore.setCollapse();
}

const mobileOpen = ref(false)
const notificationCount = ref(9)
const menu = [
  { title: 'overview.title', to: '/', icon: 'clarity:dashboard-line' },
  { title: 'Conversations', to: '/conversations', icon: 'clarity:dashboard-line', count: 12 },
]
const active = (to: string) => to === '/' ? route.path === '/' : route.path.startsWith(to)
const isLoggingOut = ref(false)
const logout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true

  const accessToken = useCookie<string | null>('token')
  const auth = useCookie<any>('auth')
  const { $socket } = useNuxtApp()

  accessToken.value = null
  auth.value = null
  $socket.disconnect()

  await navigateTo('/auth/sign-in', { replace: true })
}
watch(() => route.path, () => { mobileOpen.value = false });

const language = [
  {
    code: 'en',
    label: 'English',
    icon: 'emojione:flag-for-united-kingdom',
  },
  {
    code: 'km',
    label: 'ខ្មែរ',
    icon: 'emojione:flag-for-cambodia',
  },
] as const

const { locale, setLocale } = useI18n()
const currentLanguage = computed(() => (
  language.find(item => item.code === locale.value) ?? language[0]
))
const handleChangeLanguage = async () => {
  const currentIndex = language.findIndex(item => item.code === locale.value)
  const nextLanguage = language[(currentIndex + 1) % language.length]

  if (nextLanguage) {
    await setLocale(nextLanguage.code)
  }
}
</script>

<template>
  <div class="shell" :class="{ collapsed: isCollapsed, 'mobile-open': mobileOpen }">
    <header>
      <button class="mobile-menu" aria-label="Open navigation" @click="mobileOpen = true"><el-icon><MenuIcon /></el-icon></button>
      <div class="brand"><span class="brand-icon"><el-icon><ChatDotRound /></el-icon></span><b>គ្រប់គ្រងការងារ</b></div>
      <div class="header-main">
        <div class="flex items-center gap-2">
          <button
            class="notify"
            type="button"
            @click="handleToggleCollapse"
          >
            <Icon :size="22" name="material-symbols:menu"/>
          </button>
          <h1 class="font-medium">{{ route.meta.title || $t('overview.title') }}</h1>
        </div>
        <div class="header-actions">
          <button
            class="notify"
            type="button"
            :aria-label="`Change language. Current language: ${currentLanguage.label}`"
            :title="currentLanguage.label"
            @click="handleChangeLanguage"
          >
            <Icon :name="currentLanguage.icon" size="22" />
          </button>
          <button
            class="notify"
            type="button"
            :aria-label="`${notificationCount} unread notifications`"
          >
            <Icon name="boxicons:bell" size="21" />
            <span v-if="notificationCount > 0" class="notification-badge">
              {{ notificationCount > 99 ? '99+' : notificationCount }}
            </span>
          </button>
          <span class="avatar">{{ auth.fullName.charAt(0) }}</span>
        </div>
      </div>
    </header>

    <div class="backdrop" @click="mobileOpen = false" />
    <aside>
      <nav>
        <template v-for="item in menu" :key="item.title">
          <NuxtLink :to="item.to" class="nav-item" :class="{ active: active(item.to) }" :title="isCollapsed ? $t(item.title ): undefined">
            <Icon :name="item.icon"/><span class="nav-title">{{ $t(item.title) }}</span><em v-if="item.count">{{ item.count }}</em>
          </NuxtLink>
        </template>
      </nav>
      <div class="bottom">
        <div class="connected"><div><i /> 
          <b>{{ $t('connected') }}</b>
          <span class="relative">
            <Icon class="!text-green-500" :size="25" name="heroicons-solid:status-online"/>
            <Icon class="!text-green-500 animate-ping absolute top-0 right-0" :size="25" name="heroicons-solid:status-online"/>
          </span>
        </div>
          <p>{{ $t('real_time_updates_active') }}</p>
        </div>
        <div class="user">
          <span class="user-icon">
            <Icon name="vadivam:user-round"/>
          </span>
          <div>
            <b>{{ auth.fullName }}</b>
            <small>Administrator</small>
          </div>
        </div>
        <button class="action logout" type="button" :disabled="isLoggingOut" @click="logout">
          <Icon name="solar:logout-linear"/>
          <span class="action-label">{{ $t('logout.title') }}</span>
        </button>
      </div>
    </aside>
    <main><slot /></main>
  </div>
</template>

<style scoped>
:global(*){box-sizing:border-box}:global(body){margin:0;background:#f5f7fb;color:#172033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.shell{--side:268px;--head:72px;min-height:100vh}.shell.collapsed{--side:84px}
header{position:fixed;z-index:30;inset:0 0 auto;height:var(--head);display:flex;background:rgba(255,255,255,.95);border-bottom:1px solid #e7ebf2;backdrop-filter:blur(12px)}
.brand{width:var(--side);flex:0 0 var(--side);display:flex;align-items:center;gap:11px;padding:0 24px;color:#fff;background:#101b38;overflow:hidden;transition:.25s}.brand-icon{width:36px;height:36px;flex:none;display:grid;place-items:center;background:linear-gradient(145deg,#6b80ff,#4057e4);border-radius:11px;box-shadow:0 6px 18px #4057e466}.brand b{font-size:21px;white-space:nowrap}
.header-main{flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 30px}.header-main small{display:block;color:#8c95a8;font-size:10px;font-weight:700;letter-spacing:.12em}.header-main h1{margin:2px 0 0;font-size:19px}.header-actions{display:flex;align-items:center;gap:14px}.notify{position:relative;width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:11px;background:#f1f4f8;color:#5e687b;cursor:pointer}.notification-badge{position:absolute;top:-5px;right:-7px;min-width:19px;height:19px;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff;border-radius:999px;background:#ef4f5f;color:#fff;box-shadow:0 3px 8px #ef4f5f55;font-size:10px;font-weight:800;line-height:1}.avatar{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:#1b294c;color:#fff;font-size:12px;font-weight:700}
aside{position:fixed;z-index:25;top:var(--head);bottom:0;left:0;width:var(--side);display:flex;flex-direction:column;padding:22px 14px 16px;overflow:auto;color:#acb6ce;background:linear-gradient(#101b38,#0d1731);transition:.25s}nav{flex:1}.label{margin:0 10px 10px;color:#697694;font-size:10px;font-weight:700;letter-spacing:.12em;white-space:nowrap}.manage{margin-top:28px}.nav-item{position:relative;height:46px;display:flex;align-items:center;gap:13px;margin-bottom:5px;padding:0 12px;color:#aeb7d0;border-radius:11px;text-decoration:none;transition:.18s}.nav-item:hover{color:white;background:#ffffff0f}.nav-item.active{color:white;background:#5c70f533}.nav-item.active:before{content:'';position:absolute;left:-14px;width:3px;height:24px;background:#7185ff}.nav-item .el-icon{flex:none;font-size:20px}.nav-title{flex:1;overflow:hidden;font-size:14px;font-weight:550;white-space:nowrap}.nav-item em{min-width:25px;padding:3px 7px;color:#d1d6ff;background:#7284ff30;border-radius:20px;font-size:11px;font-style:normal;font-weight:700;text-align:center}
.connected{margin-bottom:14px;padding:14px 13px;background:#162548b3;border:1px solid #5e74b142;border-radius:10px}.connected div{display:flex;align-items:center;gap:8px;font-size:12px}.connected i{width:7px;height:7px;background:#55d273;border-radius:50%;box-shadow:0 0 9px #55d273}.connected b{flex:1;color:#f4f6ff}.connected span{color:#9fa9c5;font-size:10px}.connected p{margin:8px 0 0;color:#9fa9c5;font-size:11px}.user{display:flex;align-items:center;gap:10px;padding:12px 7px;border-top:1px solid #ffffff14}.user-icon{width:38px;height:38px;flex:none;display:grid;place-items:center;color:#dbe0ff;background:#27365e;border-radius:11px}.user div{min-width:0;display:flex;flex-direction:column}.user b{color:#f4f6ff;font-size:12px}.user small{margin-top:2px;color:#7885a5;font-size:10px}.action{width:100%;height:42px;display:flex;align-items:center;gap:12px;padding:0 12px;color:#aeb7d0;background:transparent;border:0;border-radius:10px;cursor:pointer;font-size:13px;white-space:nowrap}.logout:hover{color:#ff9299;background:#ef5d6717}.toggle{border-top:1px solid #ffffff0f;border-radius:0}.toggle:hover{color:white}
main{min-height:100vh;margin-left:var(--side);padding:calc(var(--head) + 30px) 30px 30px;transition:.25s}.mobile-menu,.backdrop{display:none}
.collapsed .brand b,.collapsed .label,.collapsed .nav-title,.collapsed .nav-item em,.collapsed .connected,.collapsed .user div,.collapsed .action-label{display:none}.collapsed .nav-item,.collapsed .action{justify-content:center;padding:0}.collapsed .user{justify-content:center}.collapsed .brand{padding:0 24px}
@media(max-width:760px){.shell,.shell.collapsed{--side:268px;--head:64px}.mobile-menu{display:grid;place-items:center;width:42px;margin-left:10px;border:0;background:transparent;color:#536078;font-size:21px}.brand{width:auto;flex:0 auto;padding:0 8px;background:white;color:#172033}.brand b{display:block!important}.header-main{justify-content:flex-end;padding:0 15px}.header-main>div:first-child{display:none}aside{top:0;z-index:50;width:268px;transform:translateX(-100%)}.mobile-open aside{transform:none;box-shadow:18px 0 50px #04091840}.collapsed .label,.collapsed .nav-title,.collapsed .nav-item em,.collapsed .connected,.collapsed .user div,.collapsed .action-label{display:initial}.collapsed .nav-item,.collapsed .action{justify-content:flex-start;padding:0 12px}.collapsed .user{justify-content:flex-start}.toggle{display:none}main{margin-left:0;padding:calc(var(--head) + 20px) 18px 20px}}
</style>

<template>
  <div>
    <nav class="w-full h-16 border-b fixed flex items-center justify-center">
      <div class="w-[90%] h-full flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img class="h-10" src="/images/logo.png"/>
          <div>Chat App</div>
        </NuxtLink>
        <div class="flex items-center gap-2">
          <div class="w-[40px] h-[40px] bg-gray-200 text-gray-700 rounded-full flex items-center justify-center relative">
            <Icon :size="25" name="ri:notification-line"/>
            <div class="bg-red-500 text-white w-[15px] h-[15px] rounded-md text-[12px] absolute -top-0 -right-0 flex items-center justify-center px-2">9+</div>
          </div>
          <el-dropdown>
            <el-image 
              src="https://hzgtzadaduhyxqahebvu.supabase.co/storage/v1/object/public/fashion-images/products/ce80885b-c7b6-4d4f-9dc8-d26ecdd5bfb5.jpg"
              class="h-[40px] w-[40px] rounded-full"
              fit="cover"
            />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>
                  <Icon name="mingcute:profile-line" :size="20"/>&nbsp;&nbsp;Edit Profile
                </el-dropdown-item>
                <el-dropdown-item>
                  <Icon name="meteor-icons:lock" :size="20"/>&nbsp;&nbsp;Change Password
                </el-dropdown-item>
                <el-dropdown-item divided @click="logout">
                  <Icon name="ant-design:logout-outlined" :size="20"/>&nbsp;&nbsp;Logout
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          
        </div>
      </div>
    </nav>
    <slot />
  </div>
</template>

<script lang="ts" setup>
  const { $socket } = useNuxtApp();
  const logout = async () => {
    const accessToken = useCookie<string | null>('token');
    
    accessToken.value = null
    $socket.disconnect();
    await navigateTo('/auth/sign-in')
  }
</script>

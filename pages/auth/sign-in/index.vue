<template>
  <div class="h-screen w-full flex items-center justify-center">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      class="w-[95%] md:w-[25%] rounded-md border p-4"
      @submit.prevent="signIn"
    >
      <el-form-item>
        <div class="flex items-center justify-center flex-col w-full">
          <el-image class="h-[100px] mx-auto" src="/images/logo.png"/>
          <div>Sign In To Chat App</div>
        </div>
      </el-form-item>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        class="mb-4"
      />
      <el-form-item label="Username" prop="username">
        <el-input
          v-model="formData.username"
          placeholder="Enter username"
          autocomplete="username"
          clearable
          @input="errorMessage = ''"
        >
          <template #prefix>
            <Icon name="uil:user"/>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="Password" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="Enter password"
          autocomplete="current-password"
          show-password
          clearable
          @input="errorMessage = ''"
        >
          <template #prefix>
            <Icon name="material-symbols:lock-outline"/>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          native-type="submit"
          class="w-full"
          :loading="isLoading"
        >
          Sign In
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
  import type { FormInstance, FormRules } from 'element-plus';

  definePageMeta({
    layout: 'auth',
  });

  const route = useRoute();

  interface FormData {
    username: string;
    password: string;
  };

  interface AuthUser {
    id: string;
    username: string;
    fullName: string;
    status: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  interface SignInResponse {
    payload: {
      users: AuthUser;
      token: {
        accessToken: string;
        tokenType: string;
        expiredIn: string;
      };
    };
    timestamp: number;
  }

  const formRef = ref<FormInstance>();
  const isLoading = ref(false);
  const errorMessage = ref('');
  const formData = ref<FormData>({
    username: '',
    password: '',
  });

  const rules: FormRules<FormData> = {
    username: [
      { required: true, message: 'Username is required', trigger: 'blur' },
    ],
    password: [
      { required: true, message: 'Password is required', trigger: 'blur' },
    ],
  };

  const getErrorMessage = (error: any): string => {
    const message = error?.data?.message;

    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    if (typeof error?.message === 'string') return error.message;
    return 'Unable to sign in. Please check your credentials and try again.';
  };

  const signIn = async () => {
    if (!formRef.value || isLoading.value) return;

    const isValid = await formRef.value.validate().catch(() => false);
    if (!isValid) return;

    isLoading.value = true;
    errorMessage.value = '';

    try {
      const response = await useApi<SignInResponse>('auth/sign-in', {
        method: 'POST',
        body: {
          username: formData.value.username.trim(),
          password: formData.value.password,
        },
      }, false);

      const token = response.payload?.token?.accessToken;
      const user = response.payload?.users;

      if (!token || !user) {
        throw new Error('The sign-in response is missing authentication data.');
      }

      const accessToken = useCookie<string | null>('token', {
        sameSite: 'lax',
        secure: import.meta.env.PROD,
      });
      accessToken.value = token;

      const auth = useCookie<AuthUser | null>('auth', {
        sameSite: 'lax',
        secure: import.meta.env.PROD,
      });
      auth.value = user;

      const { $socket } = useNuxtApp();
      $socket.auth = { token };
      $socket.connect();

      const redirect = typeof route.query.redirect === 'string'
        && route.query.redirect.startsWith('/')
        && !route.query.redirect.startsWith('//')
        ? route.query.redirect
        : '/';

      await navigateTo(redirect);
    } catch (error) {
      errorMessage.value = getErrorMessage(error);
    } finally {
      isLoading.value = false;
    }
  };
</script>

<style>

</style>

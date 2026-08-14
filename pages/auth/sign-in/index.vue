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
    middleware: 'guest',
  });

  const route = useRoute();

  interface FormData {
    username: string;
    password: string;
  };

  interface SignInResponse {
    accessToken?: string;
    access_token?: string;
    token?: string | {
      accessToken?: string;
      access_token?: string;
    };
    data?: {
      accessToken?: string;
      access_token?: string;
      token?: string;
    };
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

      const token = response.accessToken
        ?? response.access_token
        ?? (typeof response.token === 'string' ? response.token : undefined)
        ?? (typeof response.token === 'object' ? response.token.accessToken : undefined)
        ?? (typeof response.token === 'object' ? response.token.access_token : undefined)
        ?? response.data?.accessToken
        ?? response.data?.access_token
        ?? response.data?.token;

      if (!token) {
        throw new Error('The sign-in response did not include an access token.');
      }

      const accessToken = useCookie<string | null>('token', {
        sameSite: 'lax',
        secure: import.meta.env.PROD,
      });
      accessToken.value = token;

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

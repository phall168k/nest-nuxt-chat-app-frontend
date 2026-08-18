<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface UserRecord {
  id: string
  username: string
  fullName: string
}

interface UserFormData {
  username: string
  fullName: string
  password: string
  confirmPassword: string
}

const props = defineProps<{
  modelValue: boolean
  user?: UserRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t } = useI18n()
const formRef = ref<FormInstance>()
const isSubmitting = ref(false)
const errorMessage = ref('')
const formData = reactive<UserFormData>({ username: '', fullName: '', password: '', confirmPassword: '' })

const isEditing = computed(() => Boolean(props.user?.id))
const dialogTitle = computed(() => t(isEditing.value ? 'user.edit' : 'user.create'))
const rules = computed<FormRules<UserFormData>>(() => ({
  username: [
    { required: true, message: t('user.validation.username'), trigger: 'blur' },
    { min: 3, max: 50, message: t('user.validation.username_length'), trigger: 'blur' },
  ],
  fullName: [{ required: true, message: t('user.validation.full_name'), trigger: 'blur' }],
  password: [{
    validator: (_rule, value: string, callback) => {
      if (!value) callback(new Error(t('user.validation.password')))
      else if (value && value.length < 6) callback(new Error(t('user.validation.password_length')))
      else callback()
    },
    trigger: 'blur',
  }],
  confirmPassword: [{
    validator: (_rule, value: string, callback) => {
      if (!value) callback(new Error(t('user.validation.confirm_password')))
      else if (value !== formData.password) callback(new Error(t('user.validation.password_mismatch')))
      else callback()
    },
    trigger: 'blur',
  }],
}))

const close = () => emit('update:modelValue', false)
const resetForm = () => {
  formData.username = props.user?.username ?? ''
  formData.fullName = props.user?.fullName ?? ''
  formData.password = ''
  formData.confirmPassword = ''
  errorMessage.value = ''
  nextTick(() => formRef.value?.clearValidate())
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) resetForm()
})

const getErrorMessage = (error: any) => {
  const message = error?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  if (typeof error?.message === 'string') return error.message
  return t('user.error.save')
}

const submit = async () => {
  if (!formRef.value || isSubmitting.value) return
  const isValid = await formRef.value.validate().catch(() => false)
  if (!isValid) return

  isSubmitting.value = true
  errorMessage.value = ''
  const body: Partial<UserFormData> = {
    username: formData.username.trim(),
    fullName: formData.fullName.trim(),
  }
  if (formData.password) body.password = formData.password

  try {
    await useApi(
      isEditing.value ? `admin/system/users/${props.user!.id}` : 'admin/system/users',
      { method: isEditing.value ? 'PUT' : 'POST', body },
    )
    ElMessage.success(t(isEditing.value ? 'user.success.updated' : 'user.success.created'))
    emit('saved')
    close()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="min(520px, calc(100vw - 32px))"
    destroy-on-close
    @close="close"
    draggable
  >
    <el-alert v-if="errorMessage" class="form-error" :title="errorMessage" type="error" show-icon :closable="false" />

    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      @submit.prevent="submit"
      @keyup.enter.prevent="submit"
    >
      <el-form-item :label="$t('user.username')" prop="username">
        <el-input v-model="formData.username" autocomplete="username" clearable />
      </el-form-item>
      <el-form-item :label="$t('user.full_name')" prop="fullName">
        <el-input v-model="formData.fullName" autocomplete="name" clearable />
      </el-form-item>
      <el-form-item v-if="!isEditing" :label="$t('user.password')" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
      <el-form-item v-if="!isEditing" :label="$t('user.confirm_password')" prop="confirmPassword">
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          autocomplete="new-password"
          show-password
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="isSubmitting" @click="close">{{ $t('user.cancel') }}</el-button>
      <el-button type="primary" :loading="isSubmitting" @click="submit">{{ $t('user.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-error { margin-bottom: 18px; }
</style>

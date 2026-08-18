<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface ProjectRecord {
  id: string
  nameEn: string
  nameKh: string
  status: string
}

interface ProjectFormData {
  nameEn: string
  nameKh: string
  status: string
}

const props = defineProps<{
  modelValue: boolean
  project?: ProjectRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t } = useI18n()
const formRef = ref<FormInstance>()
const isSubmitting = ref(false)
const errorMessage = ref('')
const statusOptions = [
  { value: 'To Do', labelKey: 'project.statuses.todo' },
  { value: 'Pending', labelKey: 'project.statuses.pending' },
  { value: 'In Progress', labelKey: 'project.statuses.in_progress' },
  { value: 'Completed', labelKey: 'project.statuses.completed' },
] as const
const formData = reactive<ProjectFormData>({ nameEn: '', nameKh: '', status: 'To Do' })

const isEditing = computed(() => Boolean(props.project?.id))
const dialogTitle = computed(() => t(isEditing.value ? 'project.edit' : 'project.create'))
const rules = computed<FormRules<ProjectFormData>>(() => ({
  nameEn: [{ required: true, message: t('project.validation.name_en'), trigger: 'blur' }],
  nameKh: [{ required: true, message: t('project.validation.name_kh'), trigger: 'blur' }],
  status: [{ required: true, message: t('project.validation.status'), trigger: 'change' }],
}))

const close = () => emit('update:modelValue', false)
const resetForm = () => {
  formData.nameEn = props.project?.nameEn ?? ''
  formData.nameKh = props.project?.nameKh ?? ''
  formData.status = props.project?.status ?? 'To Do'
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
  return t('project.error.save')
}

const submit = async () => {
  if (!formRef.value || isSubmitting.value) return
  const isValid = await formRef.value.validate().catch(() => false)
  if (!isValid) return

  isSubmitting.value = true
  errorMessage.value = ''
  const body: ProjectFormData = {
    nameEn: formData.nameEn.trim(),
    nameKh: formData.nameKh.trim(),
    status: formData.status,
  }

  try {
    await useApi(
      isEditing.value ? `admin/master-data/projects/${props.project!.id}` : 'admin/master-data/projects',
      { method: isEditing.value ? 'PUT' : 'POST', body },
    )
    ElMessage.success(t(isEditing.value ? 'project.success.updated' : 'project.success.created'))
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
    width="min(540px, calc(100vw - 32px))"
    destroy-on-close
    draggable
    @close="close"
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
      <el-form-item :label="$t('project.name_en')" prop="nameEn">
        <el-input v-model="formData.nameEn" clearable />
      </el-form-item>
      <el-form-item :label="$t('project.name_kh')" prop="nameKh">
        <el-input v-model="formData.nameKh" clearable />
      </el-form-item>
      <el-form-item :label="$t('project.status')" prop="status">
        <el-select v-model="formData.status" class="w-full" :placeholder="$t('project.select_status')">
          <el-option v-for="status in statusOptions" :key="status.value" :label="$t(status.labelKey)" :value="status.value" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="isSubmitting" @click="close">{{ $t('project.cancel') }}</el-button>
      <el-button type="primary" :loading="isSubmitting" @click="submit">{{ $t('project.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-error { margin-bottom: 18px; }
</style>

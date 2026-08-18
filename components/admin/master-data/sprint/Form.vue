<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface SprintRecord {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  status: string
  projectId: string
}

interface SprintFormData {
  name: string
  description: string
  startDate: string
  endDate: string
  status: string
  projectId: string
}

interface ProjectOption {
  id: string
  nameEn: string
  nameKh: string
}

interface ProjectOptionsResponse {
  payload: ProjectOption[]
  timestamp: number
}

const props = defineProps<{
  modelValue: boolean
  sprint?: SprintRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t, locale } = useI18n()
const formRef = ref<FormInstance>()
const isSubmitting = ref(false)
const isLoadingProjects = ref(false)
const errorMessage = ref('')
const projectOptions = ref<ProjectOption[]>([])
const statusOptions = [
  { value: 'To Do', labelKey: 'sprint.statuses.todo' },
  { value: 'Pending', labelKey: 'sprint.statuses.pending' },
  { value: 'In Progress', labelKey: 'sprint.statuses.in_progress' },
  { value: 'Completed', labelKey: 'sprint.statuses.completed' },
  { value: 'Due Date', labelKey: 'sprint.statuses.due_date' },
] as const
const formData = reactive<SprintFormData>({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  status: 'To Do',
  projectId: '',
})

const isEditing = computed(() => Boolean(props.sprint?.id))
const dialogTitle = computed(() => t(isEditing.value ? 'sprint.edit' : 'sprint.create'))
const projectLabel = (project: ProjectOption) => locale.value === 'km'
  ? `${project.nameKh} (${project.nameEn})`
  : `${project.nameEn} (${project.nameKh})`
const rules = computed<FormRules<SprintFormData>>(() => ({
  name: [{ required: true, message: t('sprint.validation.name'), trigger: 'blur' }],
  startDate: [{ required: true, message: t('sprint.validation.start_date'), trigger: 'change' }],
  endDate: [{
    validator: (_rule, value: string, callback) => {
      if (!value) callback(new Error(t('sprint.validation.end_date')))
      else if (formData.startDate && value < formData.startDate) callback(new Error(t('sprint.validation.date_range')))
      else callback()
    },
    trigger: 'change',
  }],
  status: [{ required: true, message: t('sprint.validation.status'), trigger: 'change' }],
  projectId: [{ required: true, message: t('sprint.validation.project'), trigger: 'change' }],
}))

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  if (typeof error?.message === 'string') return error.message
  return fallback
}

const loadProjectOptions = async () => {
  isLoadingProjects.value = true
  try {
    const response = await useApi<ProjectOptionsResponse>('admin/master-data/projects/select-options')
    projectOptions.value = response.payload ?? []
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t('sprint.error.projects'))
  } finally {
    isLoadingProjects.value = false
  }
}

const close = () => emit('update:modelValue', false)
const resetForm = () => {
  formData.name = props.sprint?.name ?? ''
  formData.description = props.sprint?.description ?? ''
  formData.startDate = props.sprint?.startDate?.slice(0, 10) ?? ''
  formData.endDate = props.sprint?.endDate?.slice(0, 10) ?? ''
  formData.status = props.sprint?.status ?? 'To Do'
  formData.projectId = props.sprint?.projectId ?? ''
  errorMessage.value = ''
  nextTick(() => formRef.value?.clearValidate())
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) return
  resetForm()
  loadProjectOptions()
})

const submit = async () => {
  if (!formRef.value || isSubmitting.value) return
  const isValid = await formRef.value.validate().catch(() => false)
  if (!isValid) return

  isSubmitting.value = true
  errorMessage.value = ''
  const body: SprintFormData = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    startDate: formData.startDate,
    endDate: formData.endDate,
    status: formData.status,
    projectId: formData.projectId,
  }

  try {
    await useApi(
      isEditing.value ? `admin/master-data/sprints/${props.sprint!.id}` : 'admin/master-data/sprints',
      { method: isEditing.value ? 'PUT' : 'POST', body },
    )
    ElMessage.success(t(isEditing.value ? 'sprint.success.updated' : 'sprint.success.created'))
    emit('saved')
    close()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t('sprint.error.save'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <el-dialog :model-value="modelValue" :title="dialogTitle" width="min(850px, calc(100vw - 32px))" destroy-on-close draggable @close="close">
    <el-alert v-if="errorMessage" class="form-error" :title="errorMessage" type="error" show-icon :closable="false" />
    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" @submit.prevent="submit" @keyup.enter.prevent="submit">
      <el-form-item :label="$t('sprint.name')" prop="name">
        <el-input v-model="formData.name" clearable />
      </el-form-item>
      <el-form-item :label="$t('sprint.description_optional')" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="3" maxlength="1000" show-word-limit />
      </el-form-item>
      <div class="date-grid">
        <el-form-item :label="$t('sprint.start_date')" prop="startDate">
          <el-date-picker v-model="formData.startDate" type="date" value-format="YYYY-MM-DD" class="!w-full" />
        </el-form-item>
        <el-form-item :label="$t('sprint.end_date')" prop="endDate">
          <el-date-picker v-model="formData.endDate" type="date" value-format="YYYY-MM-DD" class="!w-full" />
        </el-form-item>
      </div>
      <el-form-item :label="$t('sprint.project')" prop="projectId">
        <el-select v-model="formData.projectId" class="w-full" filterable :loading="isLoadingProjects" :placeholder="$t('sprint.select_project')">
          <el-option v-for="project in projectOptions" :key="project.id" :label="projectLabel(project)" :value="project.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('sprint.status')" prop="status">
        <el-select v-model="formData.status" class="w-full" :placeholder="$t('sprint.select_status')">
          <el-option v-for="status in statusOptions" :key="status.value" :label="$t(status.labelKey)" :value="status.value" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="isSubmitting" @click="close">{{ $t('sprint.cancel') }}</el-button>
      <el-button type="primary" :loading="isSubmitting" @click="submit">{{ $t('sprint.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-error { margin-bottom: 18px; }
.date-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 560px) { .date-grid { grid-template-columns: 1fr; gap: 0; } }
</style>

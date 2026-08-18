<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface TaskRecord { id: string; name: string; description: string; startDate: string; endDate: string; status: string; assignToUserId: string; reportToUserId: string; sprintId: string; sprint?: { projectId: string } }
interface TaskFormData { name: string; description: string; startDate: string; endDate: string; status: string; assignToUserId: string; reportToUserId: string; sprintId: string; projectId: string }
interface UserOption { id: string; fullName: string }
interface SprintOption { id: string; name: string }
interface ProjectOption { id: string; nameEn: string; nameKh: string }

const props = defineProps<{ modelValue: boolean; task?: TaskRecord | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()
const { t } = useI18n()
const formRef = ref<FormInstance>()
const isSubmitting = ref(false)
const isLoadingOptions = ref(false)
const errorMessage = ref('')
const userOptions = ref<UserOption[]>([])
const sprintOptions = ref<SprintOption[]>([])
const projectOptions = ref<ProjectOption[]>([])
const statusOptions = [
  { value: 'To Do', key: 'task.statuses.todo' },
  { value: 'Pending', key: 'task.statuses.pending' },
  { value: 'In Progress', key: 'task.statuses.in_progress' },
  { value: 'Completed', key: 'task.statuses.completed' },
  { value: 'Due Date', key: 'task.statuses.due_date' },
] as const
const formData = reactive<TaskFormData>({ name: '', description: '', startDate: '', endDate: '', status: 'To Do', assignToUserId: '', reportToUserId: '', sprintId: '', projectId: '' })
const isEditing = computed(() => Boolean(props.task?.id))
const dialogTitle = computed(() => t(isEditing.value ? 'task.edit' : 'task.create'))
const rules = computed<FormRules<TaskFormData>>(() => ({
  name: [{ required: true, message: t('task.validation.name'), trigger: 'blur' }],
  startDate: [{ required: true, message: t('task.validation.start_date'), trigger: 'change' }],
  endDate: [{ validator: (_rule, value: string, callback) => {
    if (!value) callback(new Error(t('task.validation.end_date')))
    else if (formData.startDate && value < formData.startDate) callback(new Error(t('task.validation.date_range')))
    else callback()
  }, trigger: 'change' }],
  status: [{ required: true, message: t('task.validation.status'), trigger: 'change' }],
  assignToUserId: [{ required: true, message: t('task.validation.assignee'), trigger: 'change' }],
  reportToUserId: [{ required: true, message: t('task.validation.reporter'), trigger: 'change' }],
  projectId: [{ required: true, message: t('task.validation.project'), trigger: 'change' }],
  sprintId: [{ required: true, message: t('task.validation.sprint'), trigger: 'change' }],
}))

const errorText = (error: any, fallback: string) => {
  const message = error?.data?.message
  return Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : error?.message ?? fallback
}
const loadOptions = async () => {
  isLoadingOptions.value = true
  try {
    const [users, projects] = await Promise.all([
      useApi<{ payload: UserOption[] }>('admin/system/users/select-options'),
      useApi<{ payload: ProjectOption[] }>('admin/master-data/projects/select-options'),
    ])
    userOptions.value = users.payload ?? []
    projectOptions.value = projects.payload ?? []
    if (formData.projectId) await loadSprintOptions(formData.projectId)
  } catch (error) { errorMessage.value = errorText(error, t('task.error.options')) }
  finally { isLoadingOptions.value = false }
}
const loadSprintOptions = async (projectId: string) => {
  if (!projectId) { sprintOptions.value = []; return }
  const response = await useApi<{ payload: SprintOption[] }>('admin/master-data/sprints/select-options', { query: { projectId } })
  sprintOptions.value = response.payload ?? []
}
const handleProjectChange = async (projectId: string) => {
  formData.sprintId = ''
  sprintOptions.value = []
  if (!projectId) return
  isLoadingOptions.value = true
  try { await loadSprintOptions(projectId) }
  catch (error) { errorMessage.value = errorText(error, t('task.error.options')) }
  finally { isLoadingOptions.value = false }
}
const reset = () => {
  formData.name = props.task?.name ?? ''
  formData.description = props.task?.description ?? ''
  formData.startDate = props.task?.startDate?.slice(0, 10) ?? ''
  formData.endDate = props.task?.endDate?.slice(0, 10) ?? ''
  formData.status = props.task?.status ?? 'To Do'
  formData.assignToUserId = props.task?.assignToUserId ?? ''
  formData.reportToUserId = props.task?.reportToUserId ?? ''
  formData.sprintId = props.task?.sprintId ?? ''
  formData.projectId = props.task?.sprint?.projectId ?? ''
  errorMessage.value = ''
  nextTick(() => formRef.value?.clearValidate())
}
watch(() => props.modelValue, (open) => { if (open) { reset(); loadOptions() } })
const close = () => emit('update:modelValue', false)
const submit = async () => {
  if (!formRef.value || isSubmitting.value) return
  if (!await formRef.value.validate().catch(() => false)) return
  isSubmitting.value = true
  errorMessage.value = ''
  const body = {
    name: formData.name.trim(), description: formData.description.trim(),
    startDate: formData.startDate, endDate: formData.endDate, status: formData.status,
    assignToUserId: formData.assignToUserId, reportToUserId: formData.reportToUserId, sprintId: formData.sprintId,
  }
  try {
    await useApi(isEditing.value ? `admin/task-management/tasks/${props.task!.id}` : 'admin/task-management/tasks', { method: isEditing.value ? 'PUT' : 'POST', body })
    ElMessage.success(t(isEditing.value ? 'task.success.updated' : 'task.success.created'))
    emit('saved'); close()
  } catch (error) { errorMessage.value = errorText(error, t('task.error.save')) }
  finally { isSubmitting.value = false }
}
</script>

<template>
  <el-dialog :model-value="modelValue" :title="dialogTitle" width="min(900px, calc(100vw - 32px))" destroy-on-close draggable @close="close">
    <el-alert v-if="errorMessage" class="form-error" :title="errorMessage" type="error" show-icon :closable="false" />
    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" @submit.prevent="submit" @keyup.enter.prevent="submit">
      <el-form-item :label="$t('task.name')" prop="name"><el-input v-model="formData.name" clearable /></el-form-item>
      <el-form-item :label="$t('task.description_optional')" prop="description"><el-input v-model="formData.description" type="textarea" :rows="3" maxlength="1000" show-word-limit /></el-form-item>
      <div class="form-grid">
        <el-form-item :label="$t('task.start_date')" prop="startDate"><el-date-picker v-model="formData.startDate" type="date" value-format="YYYY-MM-DD" class="!w-full" /></el-form-item>
        <el-form-item :label="$t('task.end_date')" prop="endDate"><el-date-picker v-model="formData.endDate" type="date" value-format="YYYY-MM-DD" class="!w-full" /></el-form-item>
        <el-form-item :label="$t('task.assignee')" prop="assignToUserId"><el-select v-model="formData.assignToUserId" class="w-full" filterable :loading="isLoadingOptions" :placeholder="$t('task.select_user')"><el-option v-for="user in userOptions" :key="user.id" :label="user.fullName" :value="user.id" /></el-select></el-form-item>
        <el-form-item :label="$t('task.reporter')" prop="reportToUserId"><el-select v-model="formData.reportToUserId" class="w-full" filterable :loading="isLoadingOptions" :placeholder="$t('task.select_user')"><el-option v-for="user in userOptions" :key="user.id" :label="user.fullName" :value="user.id" /></el-select></el-form-item>
        <el-form-item :label="$t('task.project')" prop="projectId"><el-select v-model="formData.projectId" class="w-full" filterable :loading="isLoadingOptions" :placeholder="$t('task.select_project')" @change="handleProjectChange"><el-option v-for="project in projectOptions" :key="project.id" :label="project.nameEn" :value="project.id" /></el-select></el-form-item>
        <el-form-item :label="$t('task.sprint')" prop="sprintId"><el-select v-model="formData.sprintId" class="w-full" filterable :loading="isLoadingOptions" :disabled="!formData.projectId" :placeholder="$t('task.select_sprint')"><el-option v-for="sprint in sprintOptions" :key="sprint.id" :label="sprint.name" :value="sprint.id" /></el-select></el-form-item>
        <el-form-item :label="$t('task.status')" prop="status"><el-select v-model="formData.status" class="w-full" :placeholder="$t('task.select_status')"><el-option v-for="status in statusOptions" :key="status.value" :label="$t(status.key)" :value="status.value" /></el-select></el-form-item>
      </div>
    </el-form>
    <template #footer><el-button :disabled="isSubmitting" @click="close">{{ $t('task.cancel') }}</el-button><el-button type="primary" :loading="isSubmitting" @click="submit">{{ $t('task.save') }}</el-button></template>
  </el-dialog>
</template>

<style scoped>
.form-error { margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
</style>

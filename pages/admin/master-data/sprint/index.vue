<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

definePageMeta({ title: 'sprint.title' })

interface Person { id: string; username: string; fullName: string }
interface Project { id: string; nameEn: string; nameKh: string; status: string }
interface SprintRecord {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  status: string
  projectId: string
  project: Project
  createdByUserId: string
  createdByUser: Person
  createdAt: string
  updatedAt: string
}
interface PaginationMeta { itemsPerPage: number; totalItems: number; currentPage: number; totalPages: number }
interface SprintListResponse {
  payload?: SprintRecord[] | { data: SprintRecord[]; meta?: PaginationMeta }
  data?: SprintRecord[]
}

const { t, locale } = useI18n()
const sprints = ref<SprintRecord[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const limit = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)
const isFormOpen = ref(false)
const selectedSprint = ref<SprintRecord | null>(null)
const deletingId = ref<string | null>(null)
const sprintStatusKeys: Record<string, string> = {
  'To Do': 'sprint.statuses.todo',
  Pending: 'sprint.statuses.pending',
  'In Progress': 'sprint.statuses.in_progress',
  Completed: 'sprint.statuses.completed',
  'Due Date': 'sprint.statuses.due_date',
}
const statusOptions = ['To Do', 'Pending', 'In Progress', 'Completed', 'Due Date']
const sprintStatusKey = (status: string) => sprintStatusKeys[status] ?? status
const statusType = (status: string) => {
  if (status === 'Completed') return 'success'
  if (status === 'In Progress') return 'primary'
  if (status === 'Due Date') return 'danger'
  if (status === 'Pending') return 'info'
  return 'warning'
}
const formatDate = (value: string) => value
  ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
  : '—'

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  if (typeof error?.message === 'string') return error.message
  return fallback
}

const loadSprints = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await useApi<SprintListResponse | SprintRecord[]>('admin/master-data/sprints', {
      query: {
        page: page.value,
        limit: limit.value,
        sortBy: 'id:DESC',
        search: search.value.trim() || undefined,
        'filter.status': statusFilter.value ? `$eq:${statusFilter.value}` : undefined,
      },
    })
    if (Array.isArray(response)) {
      sprints.value = response
      totalItems.value = response.length
      totalPages.value = response.length ? 1 : 0
      return
    }
    const payload = response.payload
    const data = Array.isArray(payload) ? payload : payload?.data ?? response.data ?? []
    const meta = !Array.isArray(payload) ? payload?.meta : undefined
    sprints.value = data
    totalItems.value = meta?.totalItems ?? data.length
    totalPages.value = meta?.totalPages ?? (data.length ? 1 : 0)
    page.value = meta?.currentPage ?? page.value
    limit.value = meta?.itemsPerPage ?? limit.value
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t('sprint.error.load'))
  } finally {
    isLoading.value = false
  }
}

const openCreateForm = () => { selectedSprint.value = null; isFormOpen.value = true }
const openEditForm = (sprint: SprintRecord) => { selectedSprint.value = sprint; isFormOpen.value = true }
const deleteSprint = async (sprint: SprintRecord) => {
  try {
    await ElMessageBox.confirm(t('sprint.delete_confirmation', { name: sprint.name }), t('sprint.delete'), {
      type: 'warning', confirmButtonText: t('sprint.delete'), cancelButtonText: t('sprint.cancel'),
    })
  } catch { return }

  deletingId.value = sprint.id
  try {
    await useApi(`admin/master-data/sprints/${sprint.id}`, { method: 'DELETE' })
    ElMessage.success(t('sprint.success.deleted'))
    if (sprints.value.length === 1 && page.value > 1) page.value -= 1
    await loadSprints()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('sprint.error.delete')))
  } finally { deletingId.value = null }
}

const handlePageChange = (value: number) => { page.value = value; loadSprints() }
const handleLimitChange = (value: number) => { limit.value = value; page.value = 1; loadSprints() }
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadSprints() }, 350)
})
watch(statusFilter, () => { page.value = 1; loadSprints() })
onBeforeUnmount(() => clearTimeout(searchTimer))
onMounted(loadSprints)
</script>

<template>
  <section class="user-page">
    <div class="page-heading">
      <div><h2>{{ $t('sprint.title') }}</h2></div>
      <div class="heading-actions">
        <el-input v-model="search" class="search-input" :placeholder="$t('sprint.search')" clearable>
          <template #prefix><Icon name="lucide:search" size="17" /></template>
        </el-input>
        <el-select v-model="statusFilter" class="status-filter" :placeholder="$t('sprint.filter_status')" clearable>
          <el-option :label="$t('sprint.all_statuses')" value="" />
          <el-option v-for="status in statusOptions" :key="status" :label="$t(sprintStatusKey(status))" :value="status" />
        </el-select>
        <el-button type="primary" @click="openCreateForm"><Icon name="lucide:plus" size="18" />{{ $t('sprint.create') }}</el-button>
      </div>
    </div>

    <el-card shadow="never" class="user-card">
      <el-alert v-if="errorMessage" class="load-error" :title="errorMessage" type="error" show-icon :closable="false">
        <template #default><el-button size="small" @click="loadSprints">{{ $t('sprint.retry') }}</el-button></template>
      </el-alert>
      <el-table v-loading="isLoading" :data="sprints" row-key="id" :empty-text="$t('sprint.empty')">
        <el-table-column prop="name" :label="$t('sprint.name')" min-width="180" />
        <el-table-column :label="$t('sprint.project')" min-width="190">
          <template #default="{ row }">{{ locale === 'km' ? row.project?.nameKh : row.project?.nameEn || '—' }}</template>
        </el-table-column>
        <el-table-column :label="$t('sprint.period')" min-width="210">
          <template #default="{ row }"><span class="date-range"><Icon name="lucide:calendar-days" size="15" />{{ formatDate(row.startDate) }} – {{ formatDate(row.endDate) }}</span></template>
        </el-table-column>
        <el-table-column :label="$t('sprint.status')" width="140" align="center">
          <template #default="{ row }"><el-tag :type="statusType(row.status)" effect="light" round>{{ $t(sprintStatusKey(row.status)) }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="$t('sprint.created_by')" min-width="160">
          <template #default="{ row }">{{ row.createdByUser?.fullName || '—' }}</template>
        </el-table-column>
        <el-table-column :label="$t('sprint.actions')" width="130" fixed="right" align="right">
          <template #default="{ row }">
            <el-button circle :title="$t('sprint.edit')" @click="openEditForm(row)"><Icon name="lucide:pencil" size="16" /></el-button>
            <el-button circle type="danger" plain :title="$t('sprint.delete')" :loading="deletingId === row.id" @click="deleteSprint(row)"><Icon v-if="deletingId !== row.id" name="lucide:trash-2" size="16" /></el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="totalItems > 0" class="pagination">
        <div class="pagination-summary"><span class="pagination-icon"><Icon name="lucide:calendar-range" size="18" /></span><div><strong>{{ $t('sprint.pagination.total', { total: totalItems }) }}</strong><small>{{ $t('sprint.pagination.page', { page, pages: totalPages }) }}</small></div></div>
        <div class="pagination-controls">
          <label for="sprint-page-size">{{ $t('sprint.pagination.per_page') }}</label>
          <el-select id="sprint-page-size" :model-value="limit" class="page-size !min-w-[80px]" @change="handleLimitChange"><el-option v-for="size in [10, 20, 50]" :key="size" :label="size" :value="size" /></el-select>
          <el-pagination background :current-page="page" :page-size="limit" :total="totalItems" layout="prev, pager, next" @update:current-page="handlePageChange" />
        </div>
      </div>
    </el-card>
    <AdminMasterDataSprintForm v-model="isFormOpen" :sprint="selectedSprint" @saved="loadSprints" />
  </section>
</template>

<style scoped>
.date-range { display: inline-flex; align-items: center; gap: 6px; color: #5e687b; white-space: nowrap; }
</style>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

definePageMeta({ title: 'project.title' })

interface ProjectCreator {
  id: string
  username: string
  fullName: string
  status: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
}

interface ProjectRecord {
  id: string
  nameEn: string
  nameKh: string
  status: string
  sprintCount: number
  createdByUserId: string
  createdByUser: ProjectCreator
  createdAt: string
  updatedAt: string
}

interface PaginationMeta {
  itemsPerPage: number
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ProjectListResponse {
  payload?: ProjectRecord[] | { data: ProjectRecord[]; meta?: PaginationMeta }
  data?: ProjectRecord[]
}

const { t, locale } = useI18n()
const projects = ref<ProjectRecord[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
const statusFilter = ref('')
const page = ref(1)
const limit = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)
const isFormOpen = ref(false)
const selectedProject = ref<ProjectRecord | null>(null)
const deletingId = ref<string | null>(null)
const projectStatusKeys: Record<string, string> = {
  'To Do': 'project.statuses.todo',
  Pending: 'project.statuses.pending',
  'In Progress': 'project.statuses.in_progress',
  Completed: 'project.statuses.completed',
}
const statusOptions = ['To Do', 'Pending', 'In Progress', 'Completed']
const projectStatusKey = (status: string) => projectStatusKeys[status] ?? status

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  if (typeof error?.message === 'string') return error.message
  return fallback
}

const loadProjects = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await useApi<ProjectListResponse | ProjectRecord[]>('admin/master-data/projects', {
      query: {
        page: page.value,
        limit: limit.value,
        sortBy: 'id:DESC',
        search: search.value.trim() || undefined,
        'filter.status': statusFilter.value ? `$eq:${statusFilter.value}` : undefined,
      },
    })

    if (Array.isArray(response)) {
      projects.value = response
      totalItems.value = response.length
      totalPages.value = 1
      return
    }

    const payload = response.payload
    const data = Array.isArray(payload) ? payload : payload?.data ?? response.data ?? []
    const meta = !Array.isArray(payload) ? payload?.meta : undefined
    projects.value = data
    totalItems.value = meta?.totalItems ?? data.length
    totalPages.value = meta?.totalPages ?? (data.length ? 1 : 0)
    page.value = meta?.currentPage ?? page.value
    limit.value = meta?.itemsPerPage ?? limit.value
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t('project.error.load'))
  } finally {
    isLoading.value = false
  }
}

const openCreateForm = () => {
  selectedProject.value = null
  isFormOpen.value = true
}
const openEditForm = (project: ProjectRecord) => {
  selectedProject.value = project
  isFormOpen.value = true
}

const deleteProject = async (project: ProjectRecord) => {
  try {
    await ElMessageBox.confirm(t('project.delete_confirmation', { name: project.nameEn }), t('project.delete'), {
      type: 'warning',
      confirmButtonText: t('project.delete'),
      cancelButtonText: t('project.cancel'),
    })
  } catch {
    return
  }

  deletingId.value = project.id
  try {
    await useApi(`admin/master-data/projects/${project.id}`, { method: 'DELETE' })
    ElMessage.success(t('project.success.deleted'))
    if (projects.value.length === 1 && page.value > 1) page.value -= 1
    await loadProjects()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('project.error.delete')))
  } finally {
    deletingId.value = null
  }
}

const handlePageChange = (value: number) => {
  page.value = value
  loadProjects()
}
const handleLimitChange = (value: number) => {
  limit.value = value
  page.value = 1
  loadProjects()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadProjects()
  }, 350)
})
watch(statusFilter, () => {
  page.value = 1
  loadProjects()
})
onBeforeUnmount(() => clearTimeout(searchTimer))
onMounted(loadProjects)
</script>

<template>
  <section class="user-page">
    <div class="page-heading">
      <div><h2>{{ $t('project.title') }}</h2></div>
      <div class="heading-actions">
        <el-input v-model="search" class="search-input" :placeholder="$t('project.search')" clearable>
          <template #prefix><Icon name="lucide:search" size="17" /></template>
        </el-input>
        <el-select v-model="statusFilter" class="status-filter" :placeholder="$t('project.filter_status')" clearable>
          <el-option :label="$t('project.all_statuses')" value="" />
          <el-option
            v-for="status in statusOptions"
            :key="status"
            :label="$t(projectStatusKey(status))"
            :value="status"
          />
        </el-select>
        <el-button type="primary" @click="openCreateForm">
          <Icon name="lucide:plus" size="18" />
          {{ $t('project.create') }}
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="user-card">
      <el-alert v-if="errorMessage" class="load-error" :title="errorMessage" type="error" show-icon :closable="false">
        <template #default><el-button size="small" @click="loadProjects">{{ $t('project.retry') }}</el-button></template>
      </el-alert>

      <el-table v-loading="isLoading" :data="projects" row-key="id" :empty-text="$t('project.empty')">
        <el-table-column prop="nameEn" :label="$t('project.name_en')" min-width="180" />
        <el-table-column prop="nameKh" :label="$t('project.name_kh')" min-width="190" />
        <el-table-column :label="$t('project.status')" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'Completed' ? 'success' : row.status === 'In Progress' ? 'primary' : row.status === 'Pending' ? 'info' : 'warning'" effect="light" round>
              {{ $t(projectStatusKey(row.status)) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('project.sprint_count')" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="primary" effect="plain" round>
              <span class="status-label"><Icon name="lucide:calendar-range" size="14" />{{ row.sprintCount ?? 0 }}</span>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('project.created_by')" min-width="170">
          <template #default="{ row }">{{ row.createdByUser?.fullName || '—' }}</template>
        </el-table-column>
        <el-table-column :label="$t('project.created_at')" min-width="160">
          <template #default="{ row }">
            {{ new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.createdAt)) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('project.actions')" width="130" fixed="right" align="right">
          <template #default="{ row }">
            <el-button circle :title="$t('project.edit')" @click="openEditForm(row)"><Icon name="lucide:pencil" size="16" /></el-button>
            <el-button circle type="danger" plain :title="$t('project.delete')" :loading="deletingId === row.id" @click="deleteProject(row)">
              <Icon v-if="deletingId !== row.id" name="lucide:trash-2" size="16" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="totalItems > 0" class="pagination">
        <div class="pagination-summary">
          <span class="pagination-icon"><Icon name="lucide:folder-kanban" size="18" /></span>
          <div>
            <strong>{{ $t('project.pagination.total', { total: totalItems }) }}</strong>
            <small>{{ $t('project.pagination.page', { page, pages: totalPages }) }}</small>
          </div>
        </div>
        <div class="pagination-controls">
          <label for="project-page-size">{{ $t('project.pagination.per_page') }}</label>
          <el-select id="project-page-size" :model-value="limit" class="page-size !min-w-[80px]" @change="handleLimitChange">
            <el-option v-for="size in [10, 20, 50]" :key="size" :label="size" :value="size" />
          </el-select>
          <el-pagination background :current-page="page" :page-size="limit" :total="totalItems" layout="prev, pager, next" @update:current-page="handlePageChange" />
        </div>
      </div>
    </el-card>

    <AdminMasterDataProjectForm v-model="isFormOpen" :project="selectedProject" @saved="loadProjects" />
  </section>
</template>

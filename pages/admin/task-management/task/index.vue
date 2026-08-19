<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { SOCKET_EVENTS } from '~/constants/socket-event.constant';
const { $socket } = useNuxtApp();

definePageMeta({ title: 'task.title' })
interface Person { id: string; username: string; fullName: string }
interface Project { id: string; nameEn: string; nameKh: string }
interface Sprint { id: string; name: string; project?: Project }
interface UserOption { id: string; fullName: string }
interface TaskRecord { id: string; name: string; description: string; startDate: string; endDate: string; status: string; assignToUserId: string; assignToUser: Person; reportToUserId: string; reportToUser: Person; sprintId: string; sprint: Sprint; createdByUserId: string; createdByUser: Person; createdAt: string; updatedAt: string }
interface Meta { itemsPerPage: number; totalItems: number; currentPage: number; totalPages: number }
interface Response { payload: { data: TaskRecord[]; meta: Meta; links: Record<string, string> }; timestamp: number }

const { t, locale } = useI18n()
const tasks = ref<TaskRecord[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
const statusFilter = ref('')
const createdByUserId = ref('')
const assignToUserId = ref('')
const reportToUserId = ref('')
const sprintId = ref('')
const projectId = ref('')
const startDate = ref('')
const endDate = ref('')
const userOptions = ref<UserOption[]>([])
const sprintOptions = ref<{ id: string; name: string }[]>([])
const projectOptions = ref<Project[]>([])
const isLoadingFilters = ref(false)
const page = ref(1)
const limit = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)
const isFormOpen = ref(false)
const selectedTask = ref<TaskRecord | null>(null)
const deletingId = ref<string | null>(null)
const statusKeys: Record<string, string> = { 'To Do': 'task.statuses.todo', Pending: 'task.statuses.pending', 'In Progress': 'task.statuses.in_progress', Completed: 'task.statuses.completed', 'Due Date': 'task.statuses.due_date' }
const statusOptions = Object.keys(statusKeys)
const statusKey = (status: string) => statusKeys[status] ?? status
const statusType = (status: string) => status === 'Completed' ? 'success' : status === 'In Progress' ? 'primary' : status === 'Due Date' ? 'danger' : status === 'Pending' ? 'info' : 'warning'
const formatDate = (value: string) => value ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—'
const errorText = (error: any, fallback: string) => {
  const message = error?.data?.message
  return Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : error?.message ?? fallback
}
const loadTasks = async () => {
  isLoading.value = true; errorMessage.value = ''
  try {
    const response = await useApi<Response>('admin/task-management/tasks', {
      query: {
        page: page.value,
        limit: limit.value,
        sortBy: 'id:DESC',
        search: search.value.trim() || undefined,
        'filter.status': statusFilter.value || undefined,
        'filter.createdByUserId': createdByUserId.value || undefined,
        'filter.assignToUserId': assignToUserId.value || undefined,
        'filter.reportToUserId': reportToUserId.value || undefined,
        'filter.sprintId': sprintId.value || undefined,
        'filter.sprint.projectId': projectId.value || undefined,
        'filter.startDate': startDate.value ? `$gte:${startDate.value}` : undefined,
        'filter.endDate': endDate.value ? `$lte:${endDate.value}` : undefined,
      }
    })
    tasks.value = response.payload.data
    totalItems.value = response.payload.meta.totalItems
    totalPages.value = response.payload.meta.totalPages
    page.value = response.payload.meta.currentPage
    limit.value = response.payload.meta.itemsPerPage
  } catch (error) { errorMessage.value = errorText(error, t('task.error.load')) }
  finally { isLoading.value = false }
}
const openCreate = () => { selectedTask.value = null; isFormOpen.value = true }
const openEdit = (task: TaskRecord) => { selectedTask.value = task; isFormOpen.value = true }
const deleteTask = async (task: TaskRecord) => {
  try { 
    await ElMessageBox.confirm(t('task.delete_confirmation', { name: task.name }), t('task.delete'), { type: 'warning', confirmButtonText: t('task.delete'), cancelButtonText: t('task.cancel') }) } catch { return }
  deletingId.value = task.id
  try { 
    // await useApi(`admin/task-management/tasks/${task.id}`, { method: 'DELETE' }); 
    $socket.emit(SOCKET_EVENTS.TASK.DELETE, {
      id: task.id,
    });
    ElMessage.success(t('task.success.deleted')); 
    if (tasks.value.length === 1 && page.value > 1) page.value--; 
    await loadTasks() 
  }
  catch (error) { ElMessage.error(errorText(error, t('task.error.delete'))) }
  finally { deletingId.value = null }
}
const changePage = (value: number) => { page.value = value; loadTasks() }
const changeLimit = (value: number) => { limit.value = value; page.value = 1; loadTasks() }
const loadSprintOptions = async (selectedProjectId = '') => {
  const response = await useApi<{ payload: { id: string; name: string }[] }>('admin/master-data/sprints/select-options', {
    query: { projectId: selectedProjectId || undefined },
  })
  sprintOptions.value = response.payload ?? []
}
const loadFilterOptions = async () => {
  isLoadingFilters.value = true
  const [usersResult, projectsResult] = await Promise.allSettled([
    useApi<{ payload: UserOption[] }>('admin/system/users/select-options'),
    useApi<{ payload: Project[] }>('admin/master-data/projects/select-options'),
  ])

  if (usersResult.status === 'fulfilled') userOptions.value = usersResult.value.payload ?? []
  if (projectsResult.status === 'fulfilled') projectOptions.value = projectsResult.value.payload ?? []

  const failedResult = [usersResult, projectsResult].find(result => result.status === 'rejected')
  if (failedResult?.status === 'rejected') {
    errorMessage.value = errorText(failedResult.reason, t('task.error.options'))
  }

  isLoadingFilters.value = false
}
const handleProjectFilterChange = async (value: string) => {
  sprintId.value = ''
  isLoadingFilters.value = true
  try { await loadSprintOptions(value) }
  catch (error) { errorMessage.value = errorText(error, t('task.error.options')) }
  finally { isLoadingFilters.value = false }
}
const clearFilters = () => {
  statusFilter.value = ''
  createdByUserId.value = ''
  assignToUserId.value = ''
  reportToUserId.value = ''
  sprintId.value = ''
  projectId.value = ''
  startDate.value = ''
  endDate.value = ''
  sprintOptions.value = []
}
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; loadTasks() }, 350) })
watch([statusFilter, createdByUserId, assignToUserId, reportToUserId, sprintId, projectId, startDate, endDate], () => { page.value = 1; loadTasks() })

const handleGetTask = (task: TaskRecord) => {
  tasks.value.unshift(task);
}
const handleUpdateTask = (task: TaskRecord) => {
  const index = tasks.value.findIndex((item) => item.id === task.id);

  if (index !== -1) {
    tasks.value[index] = task;
  }
};

const handleRemoveTask = (task: TaskRecord) => {
  const index = tasks.value.findIndex((item) => item.id === task.id);
  if (index !== -1) {
    tasks.value.splice(index, 1);
  }
}

onMounted(() => {
  $socket.on(SOCKET_EVENTS.TASK.CREATED, handleGetTask);
  $socket.on(SOCKET_EVENTS.TASK.UPDATED, handleUpdateTask);
  $socket.on(SOCKET_EVENTS.TASK.DELETED, handleRemoveTask);
  loadTasks();
  loadFilterOptions()
});

onBeforeUnmount(() => {
  $socket.off(SOCKET_EVENTS.TASK.CREATED);
  $socket.off(SOCKET_EVENTS.TASK.UPDATED);
  $socket.off(SOCKET_EVENTS.TASK.DELETED);
  clearTimeout(timer);
});
</script>

<template>
  <section class="user-page">
    <div class="page-heading">
      <div>
        <h2>{{ $t('task.title') }}</h2>
      </div>
      <div class="heading-actions">
        <el-input v-model="search" class="search-input" :placeholder="$t('task.search')" clearable><template #prefix>
            <Icon name="lucide:search" size="17" />
          </template></el-input>
        <el-button type="primary" @click="openCreate">
          <Icon name="lucide:plus" size="18" />{{ $t('task.create') }}
        </el-button>
      </div>
    </div>
    <el-card shadow="never" class="user-card">
      <div class="task-filters">
        <el-select v-model="statusFilter" :placeholder="$t('task.filter_status')" clearable><el-option
            v-for="status in statusOptions" :key="status" :label="$t(statusKey(status))" :value="status" /></el-select>
        <el-select v-model="createdByUserId" filterable clearable :loading="isLoadingFilters"
          :placeholder="$t('task.filter_creator')"><el-option v-for="user in userOptions" :key="user.id"
            :label="user.fullName" :value="user.id" /></el-select>
        <el-select v-model="assignToUserId" filterable clearable :loading="isLoadingFilters"
          :placeholder="$t('task.filter_assignee')"><el-option v-for="user in userOptions" :key="user.id"
            :label="user.fullName" :value="user.id" /></el-select>
        <el-select v-model="reportToUserId" filterable clearable :loading="isLoadingFilters"
          :placeholder="$t('task.filter_reporter')"><el-option v-for="user in userOptions" :key="user.id"
            :label="user.fullName" :value="user.id" /></el-select>
        <el-select v-model="projectId" filterable clearable :loading="isLoadingFilters"
          :placeholder="$t('task.filter_project')" @change="handleProjectFilterChange"><el-option
            v-for="project in projectOptions" :key="project.id"
            :label="locale === 'km' ? project.nameKh : project.nameEn" :value="project.id" /></el-select>
        <el-select v-model="sprintId" filterable clearable :loading="isLoadingFilters" :disabled="!projectId"
          :placeholder="$t('task.filter_sprint')"><el-option v-for="sprint in sprintOptions" :key="sprint.id"
            :label="sprint.name" :value="sprint.id" /></el-select>
        <el-date-picker v-model="startDate" type="date" value-format="YYYY-MM-DD"
          :placeholder="$t('task.filter_start_date')" />
        <el-date-picker v-model="endDate" type="date" value-format="YYYY-MM-DD"
          :placeholder="$t('task.filter_end_date')" />
        <el-button plain @click="clearFilters">
          <Icon name="lucide:rotate-ccw" size="16" />{{ $t('task.clear_filters') }}
        </el-button>
      </div>
      <el-alert v-if="errorMessage" class="load-error" :title="errorMessage" type="error" show-icon
        :closable="false"><template #default><el-button size="small" @click="loadTasks">{{ $t('task.retry')
        }}</el-button></template></el-alert>
      <el-table v-loading="isLoading" :data="tasks" row-key="id" :empty-text="$t('task.empty')">
        <el-table-column prop="name" :label="$t('task.name')" min-width="190" />
        <el-table-column :label="$t('task.sprint')" min-width="150"><template #default="{ row }">{{ row.sprint?.name ||
          '—' }}</template></el-table-column>
        <el-table-column :label="$t('task.project')" min-width="170"><template #default="{ row }">{{ locale === 'km' ?
          row.sprint?.project?.nameKh : row.sprint?.project?.nameEn || '—' }}</template></el-table-column>
        <el-table-column :label="$t('task.assignee')" min-width="160"><template #default="{ row }">{{
          row.assignToUser?.fullName || '—' }}</template></el-table-column>
        <el-table-column :label="$t('task.reporter')" min-width="160"><template #default="{ row }">{{
          row.reportToUser?.fullName || '—' }}</template></el-table-column>
        <el-table-column :label="$t('task.period')" min-width="210"><template #default="{ row }"><span
              class="date-range">
              <Icon name="lucide:calendar-days" size="15" />{{ formatDate(row.startDate) }} – {{ formatDate(row.endDate)
              }}
            </span></template></el-table-column>
        <el-table-column :label="$t('task.status')" width="140" align="center"><template #default="{ row }"><el-tag
              :type="statusType(row.status)" effect="light" round>{{ $t(statusKey(row.status))
              }}</el-tag></template></el-table-column>
        <el-table-column :label="$t('task.actions')" width="130" fixed="right" align="right"><template
            #default="{ row }"><el-button circle :title="$t('task.edit')" @click="openEdit(row)">
              <Icon name="lucide:pencil" size="16" />
            </el-button><el-button circle type="danger" plain :title="$t('task.delete')"
              :loading="deletingId === row.id" @click="deleteTask(row)">
              <Icon v-if="deletingId !== row.id" name="lucide:trash-2" size="16" />
            </el-button></template></el-table-column>
      </el-table>
      <div v-if="totalItems > 0" class="pagination">
        <div class="pagination-summary"><span class="pagination-icon">
            <Icon name="lucide:list-checks" size="18" />
          </span>
          <div><strong>{{ $t('task.pagination.total', { total: totalItems }) }}</strong><small>{{
            $t('task.pagination.page',
              { page, pages: totalPages }) }}</small></div>
        </div>
        <div class="pagination-controls"><label for="task-page-size">{{ $t('task.pagination.per_page')
        }}</label><el-select id="task-page-size" :model-value="limit" class="page-size !min-w-[80px]"
            @change="changeLimit"><el-option v-for="size in [10, 20, 50]" :key="size" :label="size"
              :value="size" /></el-select><el-pagination background :current-page="page" :page-size="limit"
            :total="totalItems" layout="prev, pager, next" @update:current-page="changePage" /></div>
      </div>
    </el-card>
    <AdminTaskManagementTaskForm v-model="isFormOpen" :task="selectedTask" @saved="loadTasks" />
  </section>
</template>

<style scoped>
.date-range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5e687b;
  white-space: nowrap;
}
</style>

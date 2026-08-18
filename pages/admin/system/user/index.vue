<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

definePageMeta({ title: 'user.title' })

interface UserRecord {
  id: string
  username: string
  fullName: string
  status: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface UserListResponse {
  payload: {
    data: UserRecord[]
    meta: {
      itemsPerPage: number
      totalItems: number
      currentPage: number
      totalPages: number
      sortBy: [string, string][]
    }
    links: { current: string }
  }
  timestamp: number
}

const { t, locale } = useI18n()
const users = ref<UserRecord[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
const page = ref(1)
const limit = ref(10)
const totalItems = ref(0)
const totalPages = ref(0)
const isFormOpen = ref(false)
const selectedUser = ref<UserRecord | null>(null)
const deletingId = ref<string | null>(null)

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string') return message
  if (typeof error?.message === 'string') return error.message
  return fallback
}

const loadUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await useApi<UserListResponse>('admin/system/users', {
      query: {
        page: page.value,
        limit: limit.value,
        sortBy: 'id:DESC',
        search: search.value.trim() || undefined,
      },
    })
    users.value = response.payload.data
    totalItems.value = response.payload.meta.totalItems
    totalPages.value = response.payload.meta.totalPages
    page.value = response.payload.meta.currentPage
    limit.value = response.payload.meta.itemsPerPage
  } catch (error) {
    errorMessage.value = getErrorMessage(error, t('user.error.load'))
  } finally {
    isLoading.value = false
  }
}

const openCreateForm = () => {
  selectedUser.value = null
  isFormOpen.value = true
}
const openEditForm = (user: UserRecord) => {
  selectedUser.value = user
  isFormOpen.value = true
}

const deleteUser = async (user: UserRecord) => {
  try {
    await ElMessageBox.confirm(t('user.delete_confirmation', { name: user.fullName }), t('user.delete'), {
      type: 'warning',
      confirmButtonText: t('user.delete'),
      cancelButtonText: t('user.cancel'),
    })
  } catch {
    return
  }

  deletingId.value = user.id
  try {
    await useApi(`admin/system/users/${user.id}`, { method: 'DELETE' })
    ElMessage.success(t('user.success.deleted'))
    if (users.value.length === 1 && page.value > 1) page.value -= 1
    await loadUsers()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('user.error.delete')))
  } finally {
    deletingId.value = null
  }
}

const handlePageChange = (value: number) => {
  page.value = value
  loadUsers()
}
const handleLimitChange = (value: number) => {
  limit.value = value
  page.value = 1
  loadUsers()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadUsers()
  }, 350)
})

onBeforeUnmount(() => clearTimeout(searchTimer))
onMounted(loadUsers)
</script>

<template>
  <section class="user-page">
    <div class="page-heading">
      <div>
        <h2>{{ $t('user.title') }}</h2>
      </div>
      <div class="heading-actions">
        <el-input
          v-model="search"
          class="search-input"
          :placeholder="$t('user.search')"
          clearable
        >
          <template #prefix><Icon name="lucide:search" size="17" /></template>
        </el-input>
        <el-button type="primary" @click="openCreateForm">
          <Icon name="lucide:plus" size="18" />
          {{ $t('user.create') }}
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="user-card">
      <el-alert v-if="errorMessage" class="load-error" :title="errorMessage" type="error" show-icon :closable="false">
        <template #default><el-button size="small" @click="loadUsers">{{ $t('user.retry') }}</el-button></template>
      </el-alert>

      <el-table v-loading="isLoading" :data="users" row-key="id" :empty-text="$t('user.empty')">
        <el-table-column prop="fullName" :label="$t('user.full_name')" min-width="190" />
        <el-table-column prop="username" :label="$t('user.username')" min-width="150" />
        <el-table-column :label="$t('user.status')" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'info'" effect="light" round>
              <span class="status-label">
                <i :class="{ online: row.status }" />
                {{ row.status ? $t('user.online') : $t('user.offline') }}
              </span>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('user.account_status')" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'primary' : 'danger'" effect="light" round>
              {{ row.isActive ? $t('user.active') : $t('user.inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('user.created_at')" min-width="180">
          <template #default="{ row }">
            {{ new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(row.createdAt)) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('user.actions')" width="130" fixed="right" align="right">
          <template #default="{ row }">
            <el-button circle :title="$t('user.edit')" @click="openEditForm(row)">
              <Icon name="lucide:pencil" size="16" />
            </el-button>
            <el-button circle type="danger" plain :title="$t('user.delete')" :loading="deletingId === row.id" @click="deleteUser(row)">
              <Icon v-if="deletingId !== row.id" name="lucide:trash-2" size="16" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="totalItems > 0" class="pagination">
        <div class="pagination-summary">
          <span class="pagination-icon"><Icon name="lucide:users" size="18" /></span>
          <div>
            <strong>{{ $t('user.pagination.total', { total: totalItems }) }}</strong>
            <small>{{ $t('user.pagination.page', { page, pages: totalPages }) }}</small>
          </div>
        </div>

        <div class="pagination-controls">
          <label for="user-page-size">{{ $t('user.pagination.per_page') }}</label>
          <el-select id="user-page-size" :model-value="limit" class="page-size !min-w-[80px]" @change="handleLimitChange">
            <el-option v-for="size in [10, 20, 50]" :key="size" :label="size" :value="size" />
          </el-select>
          <el-pagination
            background
            :current-page="page"
            :page-size="limit"
            :total="totalItems"
            layout="prev, pager, next"
            @update:current-page="handlePageChange"
          />
        </div>
      </div>
    </el-card>

    <AdminSystemUserForm v-model="isFormOpen" :user="selectedUser" @saved="loadUsers" />
  </section>
</template>

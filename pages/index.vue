<template>
  <div class="mx-auto w-[90%] pt-24">
    <h1>Home Page</h1>
    <!-- User listing -->
     <el-table
      :data="users"
      stripe
      v-loading="getUserLoading"
     >
      <el-table-column type="index" label="No"/>
      <el-table-column prop="username" label="Username" />
      <el-table-column prop="fullName" label="Full Name" />
      <el-table-column label="Status">
        <template #default="scope">
          <span class="relative flex size-3 p-">
            <span class="relative inline-flex size-3 rounded-full" :class="scope.row.status ? 'bg-green-500' : 'bg-red-500'"></span>
          </span>
        </template>
      </el-table-column>
     </el-table>
  </div>
</template>

<script lang="ts" setup>
import { SOCKET_EVENTS } from '~/constants/socket-event.constant';

  definePageMeta({
    middleware: 'auth',
  });

  interface IUser {
    id: string;
    username: string;
    fullName: string;
    status: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  const users = ref<IUser[]>([]);

  const getUserLoading = ref<boolean>(true);
  const handleGetUsers = async () => {
    getUserLoading.value = true;
    try {
      const response = await useApi<IUser[]>('admin/users');
      users.value = response;
      console.log('USER response', response);
    } catch (error) {
      console.log('errro', error);
    } finally {
      getUserLoading.value = false;
    }
  }

  const { $socket } = useNuxtApp();

  onMounted(() => {
    handleGetUsers();
    $socket.connect();
    $socket.on(SOCKET_EVENTS.USER.STATUS_CHANGE, (data) => {
      const user = users.value.find(
        (item) => item.id === data.userId,
      );

      if (user) {
        user.status = data.status;
      }
    });
  });

  onUnmounted(() => {
    $socket.off(SOCKET_EVENTS.USER.STATUS_CHANGE);
  });
</script>

<style>

</style>
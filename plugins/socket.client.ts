import { io, type Socket } from 'socket.io-client';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
 const accessToken = useCookie<string | null>('token');
  const socket: Socket = io(
    config.public.socketUrl,
    {
      autoConnect: false,
      transports: ['websocket'],
      auth: {
        token: accessToken.value,
      },
    },
  );

  return {
    provide: {
      socket,
    },
  };
});
import { io, Socket } from "socket.io-client";
import BASE_URL from "@/src/config/api";


let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  socket = io(`${BASE_URL}`, {
    auth: { token },
    transports: ["websocket"],
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
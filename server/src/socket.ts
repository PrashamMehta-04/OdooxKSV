import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId: string) => {
      socket.join(userId);
    });
  });

  return io;
}

export function getIo(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

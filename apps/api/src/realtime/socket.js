import { Server } from 'socket.io';

let io = null;

export const initRealtime = (server, allowedOrigins = '*') => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    // Tenant-specific room joining
    socket.on('join_tenant', (tenantId) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}`);
      }
    });

    // Branch-specific room
    socket.on('join_branch', (branchId) => {
      if (branchId) {
        socket.join(`branch:${branchId}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
};

export const initSocket = initRealtime;
export const createSocketServer = initRealtime;

export const getIO = () => io;

export const emitTenantEvent = (tenantId, event, data) => {
  if (io && tenantId) {
    io.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};

export const emitGlobalEvent = (event, data) => {
  if (io) {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};

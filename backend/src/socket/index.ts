import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

interface SocketUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  color: string;
}

// Store active users per workspace: workspaceId -> Map<userId, SocketUser>
const workspaceUsers = new Map<string, Map<string, SocketUser & { socketId: string; lastSeen: Date }>>();

// Document version tracking for OT
const documentVersions = new Map<string, number>();

const USER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
];

const getUserColor = (userId: string): string => {
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
};

export const initSocket = (io: Server): void => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, name: true, email: true, avatar: true },
      });
      if (!user) return next(new Error('User not found'));
      (socket as Socket & { user: SocketUser }).user = { ...user, color: getUserColor(user.id) };
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as Socket & { user: SocketUser }).user;
    logger.info(`Socket connected: ${user.name} (${socket.id})`);

    // Join workspace room
    socket.on('workspace:join', async (workspaceId: string) => {
      try {
        const member = await prisma.workspaceMember.findFirst({
          where: { workspaceId, userId: user.id },
        });
        if (!member) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(workspaceId);

        if (!workspaceUsers.has(workspaceId)) {
          workspaceUsers.set(workspaceId, new Map());
        }
        workspaceUsers.get(workspaceId)!.set(user.id, {
          ...user, socketId: socket.id, lastSeen: new Date(),
        });

        const activeUsers = Array.from(workspaceUsers.get(workspaceId)!.values());

        // Notify others
        socket.to(workspaceId).emit('user:join', { user, workspaceId });

        // Send current active users to new joiner
        socket.emit('workspace:users', activeUsers);

        // Broadcast updated user list
        io.to(workspaceId).emit('presence:update', activeUsers);

        logger.info(`${user.name} joined workspace ${workspaceId}`);
      } catch (err) {
        logger.error('workspace:join error', err);
      }
    });

    // Leave workspace
    socket.on('workspace:leave', (workspaceId: string) => {
      socket.leave(workspaceId);
      workspaceUsers.get(workspaceId)?.delete(user.id);
      const activeUsers = Array.from(workspaceUsers.get(workspaceId)?.values() || []);
      socket.to(workspaceId).emit('user:leave', { user, workspaceId });
      io.to(workspaceId).emit('presence:update', activeUsers);
    });

    // Document operations (OT-inspired)
    socket.on('document:operation', async (data: {
      documentId: string;
      workspaceId: string;
      operation: { type: string; position: number; content?: string; length?: number };
      version: number;
      content: string; // full content after operation
    }) => {
      try {
        const serverVersion = documentVersions.get(data.documentId) || 0;

        // Simple OT: if client version < server version, we need to transform
        // For simplicity, we use last-write-wins with version tracking
        if (data.version < serverVersion) {
          // Send conflict info back to sender
          const currentDoc = await prisma.document.findUnique({ where: { id: data.documentId } });
          if (currentDoc) {
            socket.emit('document:conflict', {
              documentId: data.documentId,
              serverContent: currentDoc.content,
              serverVersion,
            });
            return;
          }
        }

        const newVersion = serverVersion + 1;
        documentVersions.set(data.documentId, newVersion);

        // Persist to DB
        await prisma.document.update({
          where: { id: data.documentId },
          data: { content: data.content },
        });

        // Broadcast to others in workspace
        socket.to(data.workspaceId).emit('document:update', {
          documentId: data.documentId,
          operation: data.operation,
          content: data.content,
          version: newVersion,
          userId: user.id,
          userName: user.name,
          userColor: user.color,
        });

        // Emit activity
        io.to(data.workspaceId).emit('activity:new', {
          workspaceId: data.workspaceId,
          userId: user.id,
          userName: user.name,
          action: 'EDIT',
          metadata: { documentId: data.documentId },
          createdAt: new Date(),
        });
      } catch (err) {
        logger.error('document:operation error', err);
      }
    });

    // Cursor movement
    socket.on('cursor:move', async (data: { workspaceId: string; documentId?: string; x: number; y: number; position?: number }) => {
      socket.to(data.workspaceId).emit('cursor:update', {
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        ...data,
      });

      // Persist cursor position
      await prisma.cursorPresence.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: data.workspaceId } },
        update: { x: data.x, y: data.y },
        create: { userId: user.id, workspaceId: data.workspaceId, x: data.x, y: data.y },
      }).catch(() => {});
    });

    // Version created
    socket.on('version:create', async (data: { documentId: string; workspaceId: string }) => {
      try {
        const doc = await prisma.document.findUnique({ where: { id: data.documentId } });
        if (!doc) return;

        const version = await prisma.version.create({
          data: { documentId: data.documentId, contentSnapshot: doc.content },
        });

        io.to(data.workspaceId).emit('version:created', { version, documentId: data.documentId });
      } catch (err) {
        logger.error('version:create error', err);
      }
    });

    // Workspace update broadcast
    socket.on('workspace:update', (data: { workspaceId: string; update: unknown }) => {
      socket.to(data.workspaceId).emit('workspace:updated', data.update);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${user.name}`);

      // Remove from all workspaces
      for (const [workspaceId, users] of workspaceUsers.entries()) {
        if (users.has(user.id)) {
          users.delete(user.id);
          const activeUsers = Array.from(users.values());
          io.to(workspaceId).emit('user:leave', { user, workspaceId });
          io.to(workspaceId).emit('presence:update', activeUsers);
        }
      }
    });
  });
};

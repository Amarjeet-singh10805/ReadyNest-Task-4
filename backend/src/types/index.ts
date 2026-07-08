import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
}

export interface SocketUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface CursorData {
  userId: string;
  userName: string;
  workspaceId: string;
  x: number;
  y: number;
  color: string;
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  version: number;
  userId: string;
  documentId: string;
}

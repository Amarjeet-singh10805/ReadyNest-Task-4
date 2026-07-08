export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  title: string;
  ownerId: string;
  owner: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  members: WorkspaceMember[];
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
}

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  documentId: string;
  contentSnapshot: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  color: string;
  socketId: string;
  lastSeen: string;
}

export interface CursorUpdate {
  userId: string;
  userName: string;
  userColor: string;
  workspaceId: string;
  documentId?: string;
  x: number;
  y: number;
  position?: number;
}

export interface DocumentUpdate {
  documentId: string;
  content: string;
  version: number;
  userId: string;
  userName: string;
  userColor: string;
}

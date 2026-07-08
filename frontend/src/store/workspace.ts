import { create } from 'zustand';
import { Workspace, Document, Activity, ActiveUser, CursorUpdate } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentDocument: Document | null;
  documents: Document[];
  activities: Activity[];
  activeUsers: ActiveUser[];
  cursors: Map<string, CursorUpdate>;
  documentVersion: number;

  setWorkspaces: (ws: Workspace[]) => void;
  addWorkspace: (ws: Workspace) => void;
  updateWorkspace: (ws: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setCurrentWorkspace: (ws: Workspace | null) => void;
  setCurrentDocument: (doc: Document | null) => void;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  setActivities: (acts: Activity[]) => void;
  prependActivity: (act: Activity) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
  updateCursor: (cursor: CursorUpdate) => void;
  removeCursor: (userId: string) => void;
  setDocumentVersion: (v: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  currentDocument: null,
  documents: [],
  activities: [],
  activeUsers: [],
  cursors: new Map(),
  documentVersion: 0,

  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (ws) => set((s) => ({ workspaces: [ws, ...s.workspaces] })),
  updateWorkspace: (ws) => set((s) => ({
    workspaces: s.workspaces.map((w) => (w.id === ws.id ? ws : w)),
    currentWorkspace: s.currentWorkspace?.id === ws.id ? ws : s.currentWorkspace,
  })),
  removeWorkspace: (id) => set((s) => ({ workspaces: s.workspaces.filter((w) => w.id !== id) })),
  setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
  setCurrentDocument: (doc) => set({ currentDocument: doc, documentVersion: 0 }),
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
  updateDocument: (doc) => set((s) => ({
    documents: s.documents.map((d) => (d.id === doc.id ? doc : d)),
    currentDocument: s.currentDocument?.id === doc.id ? doc : s.currentDocument,
  })),
  removeDocument: (id) => set((s) => ({
    documents: s.documents.filter((d) => d.id !== id),
    currentDocument: s.currentDocument?.id === id ? null : s.currentDocument,
  })),
  setActivities: (activities) => set({ activities }),
  prependActivity: (act) => set((s) => ({ activities: [act, ...s.activities].slice(0, 100) })),
  setActiveUsers: (activeUsers) => set({ activeUsers }),
  updateCursor: (cursor) => set((s) => {
    const cursors = new Map(s.cursors);
    cursors.set(cursor.userId, cursor);
    return { cursors };
  }),
  removeCursor: (userId) => set((s) => {
    const cursors = new Map(s.cursors);
    cursors.delete(userId);
    return { cursors };
  }),
  setDocumentVersion: (documentVersion) => set({ documentVersion }),
}));

import { Router } from 'express';
import authRoutes from './auth.routes';
import { authenticate } from '../middleware/auth';
import {
  createWorkspace, getWorkspaces, getWorkspace, updateWorkspace,
  deleteWorkspace, inviteMember, removeMember, updateMemberRole
} from '../controllers/workspace.controller';
import {
  createDocument, getDocuments, getDocument, updateDocument, deleteDocument,
  getVersions, createVersion, restoreVersion
} from '../controllers/document.controller';
import { getActivities, getNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/activity.controller';
import { exportDocument } from '../controllers/export.controller';

const router = Router();

// Auth
router.use('/auth', authRoutes);

// Workspaces
router.get('/workspaces', authenticate, getWorkspaces);
router.post('/workspaces', authenticate, createWorkspace);
router.get('/workspaces/:id', authenticate, getWorkspace);
router.patch('/workspaces/:id', authenticate, updateWorkspace);
router.delete('/workspaces/:id', authenticate, deleteWorkspace);
router.post('/workspaces/:id/invite', authenticate, inviteMember);
router.delete('/workspaces/:id/members/:userId', authenticate, removeMember);
router.patch('/workspaces/:id/members/:userId', authenticate, updateMemberRole);

// Documents
router.get('/workspaces/:workspaceId/documents', authenticate, getDocuments);
router.post('/workspaces/:workspaceId/documents', authenticate, createDocument);
router.get('/documents/:id', authenticate, getDocument);
router.patch('/documents/:id', authenticate, updateDocument);
router.delete('/documents/:id', authenticate, deleteDocument);
router.get('/documents/:id/versions', authenticate, getVersions);
router.post('/documents/:id/versions', authenticate, createVersion);
router.post('/documents/:id/versions/:versionId/restore', authenticate, restoreVersion);
router.get('/documents/:id/export/:format', authenticate, exportDocument);

// Activities
router.get('/workspaces/:workspaceId/activities', authenticate, getActivities);

// Notifications
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);
router.patch('/notifications/read-all', authenticate, markAllNotificationsRead);

export default router;

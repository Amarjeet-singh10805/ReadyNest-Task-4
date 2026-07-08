import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../types';

export const getActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user!.id },
    });
    if (!member) { res.status(403).json({ error: 'Access denied' }); return; }

    const activities = await prisma.activity.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(activities);
  } catch {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!notification) { res.status(404).json({ error: 'Notification not found' }); return; }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
};

import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../types';
import { z } from 'zod';

export const createWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title } = z.object({ title: z.string().min(1).max(100) }).parse(req.body);
    const workspace = await prisma.workspace.create({
      data: {
        title,
        ownerId: req.user!.id,
        members: {
          create: { userId: req.user!.id, role: 'OWNER' },
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } },
    });
    await prisma.activity.create({
      data: { workspaceId: workspace.id, userId: req.user!.id, action: 'CREATE', metadata: { type: 'workspace', title } },
    });
    res.status(201).json(workspace);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

export const getWorkspaces = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(workspaces);
  } catch {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

export const getWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id: req.params.id, members: { some: { userId: req.user!.id } } },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        documents: { orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!workspace) { res.status(404).json({ error: 'Workspace not found' }); return; }
    res.json(workspace);
  } catch {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title } = z.object({ title: z.string().min(1).max(100) }).parse(req.body);
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId: req.user!.id, role: { in: ['OWNER', 'EDITOR'] } },
    });
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
    const workspace = await prisma.workspace.update({ where: { id: req.params.id }, data: { title } });
    res.json(workspace);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

export const deleteWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });
    if (!workspace) { res.status(403).json({ error: 'Only owner can delete workspace' }); return; }
    await prisma.workspace.delete({ where: { id: req.params.id } });
    res.json({ message: 'Workspace deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
    }).parse(req.body);

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId: req.user!.id, role: { in: ['OWNER', 'EDITOR'] } },
    });
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) { res.status(404).json({ error: 'User not found' }); return; }

    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId: invitee.id },
    });
    if (existing) { res.status(409).json({ error: 'User already a member' }); return; }

    const newMember = await prisma.workspaceMember.create({
      data: { workspaceId: req.params.id, userId: invitee.id, role },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    await prisma.notification.create({
      data: { userId: invitee.id, message: `You've been invited to a workspace` },
    });

    await prisma.activity.create({
      data: {
        workspaceId: req.params.id, userId: req.user!.id,
        action: 'INVITE', metadata: { invitedUserId: invitee.id, invitedUserName: invitee.name },
      },
    });

    res.status(201).json(newMember);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId: req.user!.id, role: 'OWNER' },
    });
    if (!ownerMember) { res.status(403).json({ error: 'Only owner can remove members' }); return; }

    await prisma.workspaceMember.deleteMany({
      where: { workspaceId: req.params.id, userId: req.params.userId },
    });
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = z.object({ role: z.enum(['EDITOR', 'VIEWER']) }).parse(req.body);
    const ownerMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId: req.user!.id, role: 'OWNER' },
    });
    if (!ownerMember) { res.status(403).json({ error: 'Only owner can update roles' }); return; }

    const updated = await prisma.workspaceMember.updateMany({
      where: { workspaceId: req.params.id, userId: req.params.userId },
      data: { role },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    res.status(500).json({ error: 'Failed to update role' });
  }
};

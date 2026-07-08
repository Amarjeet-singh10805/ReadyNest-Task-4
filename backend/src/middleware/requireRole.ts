import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member || !roles.includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    (req as any).userRole = member.role;
    next();
  };
};

import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../types';
import { z } from 'zod';

const checkAccess = async (userId: string, workspaceId: string, needsWrite = false) => {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) return null;
  if (needsWrite && member.role === 'VIEWER') return null;
  return member;
};

export const createDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { title } = z.object({ title: z.string().min(1).max(200) }).parse(req.body);

    const member = await checkAccess(req.user!.id, workspaceId, true);
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }

    const doc = await prisma.document.create({
      data: { workspaceId, title, content: '' },
    });

    await prisma.activity.create({
      data: { workspaceId, userId: req.user!.id, action: 'CREATE', metadata: { type: 'document', documentId: doc.id, title } },
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    res.status(500).json({ error: 'Failed to create document' });
  }
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const member = await checkAccess(req.user!.id, workspaceId);
    if (!member) { res.status(403).json({ error: 'Access denied' }); return; }

    const docs = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(docs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const getDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await checkAccess(req.user!.id, doc.workspaceId);
    if (!member) { res.status(403).json({ error: 'Access denied' }); return; }

    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

export const updateDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({ title: z.string().min(1).max(200).optional(), content: z.string().optional() });
    const data = schema.parse(req.body);

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await checkAccess(req.user!.id, doc.workspaceId, true);
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }

    const updated = await prisma.document.update({ where: { id: req.params.id }, data });

    // Auto-save version every 10 edits (simplified - in production use timestamps)
    const versionCount = await prisma.version.count({ where: { documentId: req.params.id } });
    if (versionCount % 10 === 0 && data.content !== undefined) {
      await prisma.version.create({
        data: { documentId: req.params.id, contentSnapshot: data.content },
      });
    }

    await prisma.activity.create({
      data: { workspaceId: doc.workspaceId, userId: req.user!.id, action: 'EDIT', metadata: { documentId: doc.id, title: doc.title } },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    res.status(500).json({ error: 'Failed to update document' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await checkAccess(req.user!.id, doc.workspaceId, true);
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }

    await prisma.document.delete({ where: { id: req.params.id } });

    await prisma.activity.create({
      data: { workspaceId: doc.workspaceId, userId: req.user!.id, action: 'DELETE', metadata: { documentId: doc.id, title: doc.title } },
    });

    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const getVersions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await checkAccess(req.user!.id, doc.workspaceId);
    if (!member) { res.status(403).json({ error: 'Access denied' }); return; }

    const versions = await prisma.version.findMany({
      where: { documentId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(versions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
};

export const createVersion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await checkAccess(req.user!.id, doc.workspaceId, true);
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }

    const version = await prisma.version.create({
      data: { documentId: req.params.id, contentSnapshot: doc.content },
    });
    res.status(201).json(version);
  } catch {
    res.status(500).json({ error: 'Failed to create version' });
  }
};

export const restoreVersion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const version = await prisma.version.findUnique({ where: { id: req.params.versionId } });
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    const doc = await prisma.document.findUnique({ where: { id: version.documentId } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await checkAccess(req.user!.id, doc.workspaceId, true);
    if (!member) { res.status(403).json({ error: 'Insufficient permissions' }); return; }

    // Save current as version before restoring
    await prisma.version.create({ data: { documentId: doc.id, contentSnapshot: doc.content } });

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { content: version.contentSnapshot },
    });

    await prisma.activity.create({
      data: { workspaceId: doc.workspaceId, userId: req.user!.id, action: 'RESTORE', metadata: { documentId: doc.id, versionId: version.id } },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to restore version' });
  }
};

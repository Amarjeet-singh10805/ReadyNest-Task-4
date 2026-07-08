import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../types';

export const exportDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { format } = req.params;
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: doc.workspaceId, userId: req.user!.id },
    });
    if (!member) { res.status(403).json({ error: 'Access denied' }); return; }

    await prisma.activity.create({
      data: { workspaceId: doc.workspaceId, userId: req.user!.id, action: 'EXPORT', metadata: { documentId: doc.id, format } },
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.json"`);
      res.json({ title: doc.title, content: doc.content, exportedAt: new Date().toISOString() });
      return;
    }

    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.md"`);
      res.send(`# ${doc.title}\n\n${doc.content}`);
      return;
    }

    if (format === 'pdf') {
      // Return HTML that can be printed as PDF client-side
      const html = `<!DOCTYPE html><html><head><title>${doc.title}</title><style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; }
      </style></head><body><h1>${doc.title}</h1><div>${doc.content.replace(/\n/g, '<br>')}</div></body></html>`;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${doc.title}.pdf"`);
      res.send(html);
      return;
    }

    res.status(400).json({ error: 'Invalid export format. Use: json, markdown, or pdf' });
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
};

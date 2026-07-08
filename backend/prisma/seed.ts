import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@syncspace.io' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@syncspace.io',
      password: await bcrypt.hash('demo123456', 12),
    },
  });

  // Demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-workspace-001' },
    update: {},
    create: {
      id: 'demo-workspace-001',
      title: 'Demo Workspace',
      ownerId: demoUser.id,
      members: {
        create: { userId: demoUser.id, role: 'OWNER' },
      },
    },
  });

  // Demo document
  await prisma.document.upsert({
    where: { id: 'demo-doc-001' },
    update: {},
    create: {
      id: 'demo-doc-001',
      workspaceId: workspace.id,
      title: 'Welcome to SyncSpace',
      content: `Welcome to SyncSpace — a real-time collaborative editing platform.

You can:
- Create workspaces and invite team members
- Edit documents simultaneously with others
- Track changes via version history
- Export documents as PDF, Markdown, or JSON
- See live cursors of collaborators
- Receive real-time notifications

Try opening this document in two browser tabs to see real-time sync in action!`,
    },
  });

  console.log('Seed complete. Demo login: demo@syncspace.io / demo123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

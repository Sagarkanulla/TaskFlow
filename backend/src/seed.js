import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

async function seed() {
  const hash = await bcrypt.hash('password123', 10);
  const company = await prisma.company.upsert({
    where: { code: 'DEMO-HQ' },
    update: {},
    create: { name: 'DemoWorks Inc', code: 'DEMO-HQ', ownerId: 'seed-pending' }
  });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { companyId: company.id, employeeId: 'EMP-001', position: 'Operations Manager', designation: 'MANAGER' },
    create: { name: 'Admin Demo', email: 'admin@demo.com', password: hash, companyId: company.id, employeeId: 'EMP-001', position: 'Operations Manager', designation: 'MANAGER' }
  });
  await prisma.company.update({ where: { id: company.id }, data: { ownerId: admin.id } });
  const member = await prisma.user.upsert({
    where: { email: 'member@demo.com' },
    update: { companyId: company.id, employeeId: 'EMP-002', position: 'Frontend Engineer', designation: 'TEAM_MEMBER', managerId: admin.id },
    create: { name: 'Member Demo', email: 'member@demo.com', password: hash, companyId: company.id, employeeId: 'EMP-002', position: 'Frontend Engineer', designation: 'TEAM_MEMBER', managerId: admin.id }
  });

  const project = await prisma.project.create({
    data: {
      name: 'Sample Project',
      description: 'A demo project',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' }
        ]
      }
    }
  });

  await prisma.task.createMany({
    data: [
      { title: 'Setup repository', status: 'DONE', priority: 'HIGH', projectId: project.id, creatorId: admin.id, assigneeId: admin.id },
      { title: 'Build login page', status: 'IN_PROGRESS', priority: 'HIGH', projectId: project.id, creatorId: admin.id, assigneeId: member.id, dueDate: new Date(Date.now() + 86400000 * 3) },
      { title: 'Write README', status: 'TODO', priority: 'MEDIUM', projectId: project.id, creatorId: admin.id, assigneeId: member.id, dueDate: new Date(Date.now() - 86400000) }
    ]
  });

  console.log('Seeded');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

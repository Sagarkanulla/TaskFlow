import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate, requireProjectRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

const memberSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

const normalizeEmail = (email) => email.trim().toLowerCase();

router.post('/', async (req, res, next) => {
  try {
    const parse = projectSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { designation: true } });
    if (actor?.designation !== 'MANAGER') return res.status(403).json({ error: 'Managers only can create projects' });

    const project = await prisma.project.create({
      data: {
        ...parse.data,
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: 'ADMIN' } }
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: { where: { userId: req.user.id }, select: { role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', requireProjectRole(['ADMIN', 'MEMBER']), async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, companyId: true, designation: true } });
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, employeeId: true, position: true, designation: true } },
            creator: { select: { id: true, name: true } },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true, uploader: { select: { id: true, name: true } } } },
            reports: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              include: { user: { select: { id: true, name: true, designation: true } } }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    const companyPeople = me?.companyId ? await prisma.user.findMany({
      where: { companyId: me.companyId },
      select: { id: true, name: true, email: true, employeeId: true, position: true, designation: true, managerId: true },
      orderBy: { name: 'asc' }
    }) : [];
    res.json({ ...project, myRole: req.membership.role, myDesignation: me?.designation, myUserId: me?.id, companyPeople });
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/members', requireProjectRole(['ADMIN']), async (req, res, next) => {
  try {
    const parse = memberSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    if (!parse.data.email && !parse.data.userId) return res.status(400).json({ error: 'Email or userId required' });

    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { companyId: true, designation: true } });
    if (actor?.designation !== 'MANAGER') return res.status(403).json({ error: 'Managers only can manage project people' });
    const user = parse.data.userId
      ? await prisma.user.findUnique({ where: { id: parse.data.userId } })
      : await prisma.user.findUnique({ where: { email: normalizeEmail(parse.data.email) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (actor?.companyId && user.companyId !== actor.companyId) {
      return res.status(403).json({ error: 'User must belong to your company' });
    }

    const membership = await prisma.membership.create({
      data: { userId: user.id, projectId: req.params.projectId, role: parse.data.role },
      include: { user: { select: { id: true, name: true, email: true, employeeId: true, position: true, designation: true } } }
    });
    res.json(membership);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'User already a member' });
    next(err);
  }
});

router.delete('/:projectId/members/:userId', requireProjectRole(['ADMIN']), async (req, res, next) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { designation: true } });
    if (actor?.designation !== 'MANAGER') return res.status(403).json({ error: 'Managers only can remove project people' });
    await prisma.membership.delete({
      where: { userId_projectId: { userId: req.params.userId, projectId: req.params.projectId } }
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId', requireProjectRole(['ADMIN']), async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

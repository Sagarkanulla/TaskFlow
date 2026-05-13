import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const updatePersonSchema = z.object({
  designation: z.enum(['MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'INTERN', 'CONTRACTOR']).optional(),
  position: z.string().min(2).optional(),
  managerId: z.string().uuid().nullable().optional()
});

const personSelect = {
  id: true,
  name: true,
  email: true,
  employeeId: true,
  position: true,
  designation: true,
  managerId: true,
  manager: { select: { id: true, name: true, email: true } }
};

async function currentUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { company: true }
  });
}

function canManagePeople(user) {
  return user?.designation === 'MANAGER';
}

router.get('/', async (req, res, next) => {
  try {
    const user = await currentUser(req.user.id);
    if (!user?.companyId) return res.status(404).json({ error: 'No company linked' });

    const [people, projects] = await Promise.all([
      prisma.user.findMany({
        where: { companyId: user.companyId },
        select: personSelect,
        orderBy: [{ designation: 'asc' }, { name: 'asc' }]
      }),
      prisma.project.count({ where: { members: { some: { user: { companyId: user.companyId } } } } })
    ]);

    res.json({
      company: user.company,
      people,
      projects,
      myDesignation: user.designation,
      canManagePeople: canManagePeople(user)
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/people/:userId', async (req, res, next) => {
  try {
    const actor = await currentUser(req.user.id);
    if (!actor?.companyId || !canManagePeople(actor)) return res.status(403).json({ error: 'Managers and team leads only' });

    const parse = updatePersonSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target || target.companyId !== actor.companyId) return res.status(404).json({ error: 'Employee not found in your company' });
    if (parse.data.managerId) {
      const manager = await prisma.user.findUnique({ where: { id: parse.data.managerId } });
      if (!manager || manager.companyId !== actor.companyId) return res.status(400).json({ error: 'Manager must belong to the same company' });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: parse.data,
      select: personSelect
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

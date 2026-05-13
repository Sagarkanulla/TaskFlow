import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  workDone: z.string().optional(),
  currentWork: z.string().optional(),
  issues: z.string().optional(),
  technologies: z.string().optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO')
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  workDone: z.string().nullable().optional(),
  currentWork: z.string().nullable().optional(),
  issues: z.string().nullable().optional(),
  technologies: z.string().nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional()
});

const reportSchema = z.object({
  workDone: z.string().optional(),
  currentWork: z.string().optional(),
  issues: z.string().optional(),
  technologies: z.string().optional()
});

const attachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(2_500_000),
  data: z.string().min(1)
});

const commentSchema = z.object({
  text: z.string().min(1)
});

const subtaskSchema = z.object({
  title: z.string().min(1)
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
    const [myTasks, overdue, byStatus, totalProjects, companyProjects, teamMembers] = await Promise.all([
      prisma.task.findMany({
        where: { assigneeId: userId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10
      }),
      prisma.task.findMany({
        where: { assigneeId: userId, dueDate: { lt: now }, status: { not: 'DONE' } },
        include: { project: { select: { id: true, name: true } } }
      }),
      prisma.task.groupBy({ by: ['status'], where: { assigneeId: userId }, _count: true }),
      prisma.membership.count({ where: { userId } }),
      me?.companyId ? prisma.project.findMany({
        where: { members: { some: { user: { companyId: me.companyId } } } },
        include: { tasks: { select: { status: true } }, _count: { select: { members: true, tasks: true } } },
        orderBy: { createdAt: 'desc' }
      }) : [],
      me?.companyId ? prisma.user.count({ where: { companyId: me.companyId } }) : 0
    ]);
    const uniqueProjects = Array.from(new Map(companyProjects.map((project) => [project.id, project])).values());
    const completedProjects = uniqueProjects.filter((project) => project.tasks.length > 0 && project.tasks.every((task) => task.status === 'DONE')).length;
    const activeProjects = uniqueProjects.filter((project) => project.tasks.some((task) => task.status !== 'DONE')).length;
    res.json({
      myTasks,
      overdue,
      byStatus,
      totalProjects,
      companyStats: {
        projects: uniqueProjects.length,
        activeProjects,
        completedProjects,
        teamMembers
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parse = createTaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const { title, description, workDone, currentWork, issues, technologies, projectId, assigneeId, dueDate, priority, status } = parse.data;
    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Not a project member' });

    if (assigneeId) {
      const assigneeMembership = await prisma.membership.findUnique({
        where: { userId_projectId: { userId: assigneeId, projectId } }
      });
      if (!assigneeMembership) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        workDone,
        currentWork,
        issues,
        technologies,
        projectId,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status,
        creatorId: req.user.id
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, employeeId: true, position: true, designation: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      }
    });

    if (task.assigneeId && task.assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          message: `You were assigned a new task in ${task.project.name}: ${task.title}`,
          link: `/projects/${task.projectId}`
        }
      });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const parse = updateTaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    if (parse.data.assigneeId) {
      const assigneeMembership = await prisma.membership.findUnique({
        where: { userId_projectId: { userId: parse.data.assigneeId, projectId: task.projectId } }
      });
      if (!assigneeMembership) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...parse.data,
        dueDate: parse.data.dueDate === undefined ? undefined : parse.data.dueDate ? new Date(parse.data.dueDate) : null
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, employeeId: true, position: true, designation: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, ownerId: true } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
        reports: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, designation: true } } } },
        subtasks: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } }
      }
    });

    if (parse.data.assigneeId && parse.data.assigneeId !== task.assigneeId && parse.data.assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: parse.data.assigneeId,
          message: `You were assigned a task in ${updated.project.name}: ${updated.title}`,
          link: `/projects/${updated.projectId}`
        }
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reports', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const parse = reportSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const report = await prisma.taskReport.create({
      data: { ...parse.data, taskId: task.id, userId: req.user.id },
      include: { user: { select: { id: true, name: true, designation: true } } }
    });

    await prisma.task.update({
      where: { id: task.id },
      data: {
        workDone: parse.data.workDone ?? task.workDone,
        currentWork: parse.data.currentWork ?? task.currentWork,
        issues: parse.data.issues ?? task.issues,
        technologies: parse.data.technologies ?? task.technologies
      }
    });

    if (parse.data.issues && parse.data.issues.toLowerCase().includes('block')) {
      const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { ownerId: true, name: true } });
      if (project && project.ownerId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: project.ownerId,
            message: `Blocker reported on task "${task.title}" in ${project.name}`,
            link: `/projects/${task.projectId}`
          }
        });
      }
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/attachments', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const parse = attachmentSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        uploaderId: req.user.id,
        filename: parse.data.filename,
        mimeType: parse.data.mimeType,
        size: parse.data.size,
        data: Buffer.from(parse.data.data, 'base64')
      },
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true }
    });
    res.json(attachment);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attachments/:attachmentId', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const attachment = await prisma.taskAttachment.findUnique({ where: { id: req.params.attachmentId } });
    if (!attachment || attachment.taskId !== task.id) return res.status(404).json({ error: 'Attachment not found' });

    res.json({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      data: Buffer.from(attachment.data).toString('base64')
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership || membership.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const parse = commentSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const comment = await prisma.comment.create({
      data: {
        taskId: task.id,
        userId: req.user.id,
        text: parse.data.text
      },
      include: { user: { select: { id: true, name: true } } }
    });

    if (task.assigneeId && task.assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          message: `New comment on your task: ${task.title}`,
          link: `/projects/${task.projectId}`
        }
      });
    }

    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/subtasks', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const parse = subtaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const subtask = await prisma.subtask.create({
      data: { taskId: task.id, title: parse.data.title }
    });
    res.json(subtask);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/subtasks/:subId', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const subtask = await prisma.subtask.update({
      where: { id: req.params.subId },
      data: { isDone: req.body.isDone }
    });
    res.json(subtask);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/subtasks/:subId', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    await prisma.subtask.delete({ where: { id: req.params.subId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

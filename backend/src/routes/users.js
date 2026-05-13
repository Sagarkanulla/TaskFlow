import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const users = await prisma.user.findMany({
      where: { email: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, email: true },
      take: 10
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});



router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

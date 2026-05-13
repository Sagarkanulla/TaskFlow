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

export default router;

import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireProjectRole = (roles) => async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id || req.body.projectId;
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.user.id, projectId } }
  });

  if (!membership) return res.status(403).json({ error: 'Not a project member' });
  if (!roles.includes(membership.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  req.membership = membership;
  next();
};

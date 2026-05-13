import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  employeeId: z.string().min(1),
  position: z.string().optional(),
  designation: z.enum(['MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'INTERN', 'CONTRACTOR']),
  companyMode: z.enum(['CREATE', 'JOIN']),
  companyName: z.string().optional(),
  companyCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  employeeId: user.employeeId,
  designation: user.designation,
  company: user.company
});
const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeCode = (code) => code.trim().toUpperCase();
const makeCompanyCode = (name) => {
  const prefix = name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'TEAM';
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

router.post('/signup', async (req, res, next) => {
  try {
    const parse = signupSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const { name, password, employeeId, companyMode } = parse.data;
    const email = normalizeEmail(parse.data.email);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    let company;
    let designation = parse.data.designation;
    if (companyMode === 'CREATE') {
      if (!parse.data.companyName?.trim()) return res.status(400).json({ error: 'Company name required' });
      company = await prisma.company.create({
        data: {
          name: parse.data.companyName.trim(),
          code: makeCompanyCode(parse.data.companyName),
          ownerId: 'pending'
        }
      });
      designation = 'MANAGER';
    } else {
      if (!parse.data.companyCode?.trim()) return res.status(400).json({ error: 'Company code required' });
      company = await prisma.company.findUnique({ where: { code: normalizeCode(parse.data.companyCode) } });
      if (!company) return res.status(404).json({ error: 'Company code not found' });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        password: hash,
        employeeId: employeeId.trim(),
        position: null,
        designation,
        companyId: company.id
      },
      include: { company: { select: { id: true, name: true, code: true } } }
    });

    if (companyMode === 'CREATE') {
      await prisma.company.update({ where: { id: company.id }, data: { ownerId: user.id } });
      user.company.ownerId = user.id;
    }

    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const email = normalizeEmail(parse.data.email);
    const { password } = parse.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { id: true, name: true, code: true } } }
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        designation: true,
        company: { select: { id: true, name: true, code: true } }
      }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;

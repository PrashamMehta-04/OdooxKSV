import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge_secret_key_2024';

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, password, name, role = 'procurement_officer', vendorId } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name,
          role,
          vendorId: vendorId || null,
        },
        select: { id: true, email: true, name: true, role: true, vendorId: true, createdAt: true },
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role, vendorId: user.vendorId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({ success: true, data: { token, user } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { vendor: { select: { id: true, name: true, category: true, status: true } } },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role, vendorId: user.vendorId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _pw, ...safeUser } = user;
      return res.json({ success: true, data: { token, user: safeUser } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true, role: true, vendorId: true, createdAt: true, updatedAt: true,
        vendor: { select: { id: true, name: true, category: true, status: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Return success even if user not found (security best practice)
        return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
      }

      // Generate a reset token (in a real system, store it with expiry)
      const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
      console.log(`[forgot-password] Reset token for ${email}: ${resetToken}`);

      return res.json({
        success: true,
        message: 'Password reset token generated',
        data: { resetToken }, // Return token for dev convenience
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { token, password } = req.body;

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; type: string };
      if (decoded.type !== 'reset') {
        return res.status(400).json({ success: false, message: 'Invalid reset token' });
      }

      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { password: hashed },
      });

      return res.json({ success: true, message: 'Password reset successful. You can now login.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
  }
);

export default router;

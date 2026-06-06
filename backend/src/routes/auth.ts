import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { sendMail } from '../lib/mailer';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge_secret_key_2024';
const OTP_EXPIRY_MINUTES = 10;

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

async function verifyPasswordResetOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.otp || !user.otpExpiry) return null;

  if (user.otpExpiry.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiry: null },
    });
    return null;
  }

  const validOtp = await bcrypt.compare(otp, user.otp);
  return validOtp ? user : null;
}

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

      const { email, password, name, role = 'procurement_officer', vendorId, vendorName } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      let finalVendorId = vendorId;

      // If signing up as a vendor and no vendorId provided, create a new Vendor
      if (role === 'vendor' && !finalVendorId && vendorName) {
        const newVendor = await prisma.vendor.create({
          data: {
            name: vendorName,
            email: email, // Use user's email as vendor primary contact
            phone: 'Not provided',
            category: 'Other',
            contactPerson: name,
            status: 'active',
          },
        });
        finalVendorId = newVendor.id;
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name,
          role,
          vendorId: finalVendorId || null,
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
        return res.status(404).json({ success: false, message: 'No account found with this email. Please sign up.' });
      }

      const otp = generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otp: hashedOtp, otpExpiry },
      });

      await sendMail(
        user.email,
        'VendorBridge password reset OTP',
        `
          <div style="font-family: Arial, sans-serif; color: #111827;">
            <h2>Password reset OTP</h2>
            <p>Use this OTP to reset your VendorBridge password:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
            <p>This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `
      );

      if (!process.env.SMTP_USER) {
        console.log(`[forgot-password] OTP for ${email}: ${otp}`);
      }

      return res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/verify-otp
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, otp } = req.body;
      const user = await verifyPasswordResetOtp(email, otp);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      return res.json({ success: true, message: 'OTP verified successfully' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP required'),
    body('password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, otp, password } = req.body;

      const user = await verifyPasswordResetOtp(email, otp);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, otp: null, otpExpiry: null },
      });

      return res.json({ success: true, message: 'Password reset successful. You can now login.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
  }
);

export default router;

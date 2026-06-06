import bcrypt from "bcryptjs";
import { type Response, Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { roles } from "../domain/types.js";
import { createUser, findUserByEmail, findUserById, toAuthUser } from "./auth.repository.js";
import { requireAuth } from "./auth.middleware.js";
import { db } from "../db/client.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from "./auth.tokens.js";

export const authRouter = Router();

const refreshCookieName = "vendorbridge_refresh";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.nodeEnv === "production",
  path: "/api/auth"
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(roles)
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.")
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie(refreshCookieName, token, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, baseCookieOptions);
}

function authResponse(user: ReturnType<typeof toAuthUser>) {
  return {
    user,
    accessToken: createAccessToken(user)
  };
}

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid signup details.", errors: parsed.error.flatten() });
    return;
  }

  const existingUser = await findUserByEmail(parsed.data.email);

  if (existingUser) {
    res.status(409).json({ message: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const createdUser = await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role
  });
  const user = toAuthUser(createdUser);
  const refreshToken = createRefreshToken(user);

  setRefreshCookie(res, refreshToken);
  res.status(201).json(authResponse(user));
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid login details.", errors: parsed.error.flatten() });
    return;
  }

  const userWithPassword = await findUserByEmail(parsed.data.email);

  if (!userWithPassword) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  if (userWithPassword.status !== "ACTIVE") {
    res.status(403).json({ message: "This account is not active." });
    return;
  }

  const passwordsMatch = await bcrypt.compare(parsed.data.password, userWithPassword.passwordHash);

  if (!passwordsMatch) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const user = toAuthUser(userWithPassword);
  const refreshToken = createRefreshToken(user);

  setRefreshCookie(res, refreshToken);
  res.json(authResponse(user));
});

authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[refreshCookieName];

  if (!token || typeof token !== "string") {
    res.status(401).json({ message: "Refresh session required." });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);

    if (!payload) {
      clearRefreshCookie(res);
      res.status(401).json({ message: "Invalid refresh session." });
      return;
    }

    const userWithPassword = await findUserById(payload.userId);

    if (!userWithPassword || userWithPassword.status !== "ACTIVE") {
      clearRefreshCookie(res);
      res.status(401).json({ message: "User is not active." });
      return;
    }

    const user = toAuthUser(userWithPassword);
    const refreshToken = createRefreshToken(user);

    setRefreshCookie(res, refreshToken);
    res.json(authResponse(user));
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ message: "Invalid or expired refresh session." });
  }
});

authRouter.get("/managers", requireAuth, async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, role FROM users WHERE role = 'MANAGER' AND status = 'ACTIVE'`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch managers" });
  }
});

authRouter.get("/me", async (req, res) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);

    if (payload) {
      res.status(401).json({ message: "Use an access token for this endpoint." });
      return;
    }
  } catch {
    // Access-token validation happens below; this only rejects refresh tokens explicitly.
  }

  try {
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ message: "Invalid session." });
      return;
    }

    const userWithPassword = await findUserById(payload.userId);

    if (!userWithPassword || userWithPassword.status !== "ACTIVE") {
      res.status(401).json({ message: "User is not active." });
      return;
    }

    res.json({ user: toAuthUser(userWithPassword) });
  } catch {
    res.status(401).json({ message: "Invalid or expired session." });
  }
});

import nodemailer from "nodemailer";

// In-memory OTP store for the hackathon
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8)
});

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid email address.", errors: parsed.error.flatten() });
    return;
  }

  const existingUser = await findUserByEmail(parsed.data.email);
  
  if (existingUser) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(parsed.data.email, {
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
    });

    try {
      let transporter;
      
      // If user provided Mailtrap (or any SMTP) credentials in .env, use them!
      if (env.smtpHost && env.smtpUser) {
        transporter = nodemailer.createTransport({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpPort === 465,
          auth: {
            user: env.smtpUser,
            pass: env.smtpPass,
          },
        });
      } else {
        // Fallback to ethereal if .env is missing
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const info = await transporter.sendMail({
        from: '"VendorBridge Security" <noreply@vendorbridge.com>',
        to: parsed.data.email,
        subject: "Password Reset OTP",
        text: `Your password reset OTP is: ${otp}`,
      });

      if (!env.smtpHost) {
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      } else {
        console.log("Email sent via external SMTP (e.g. Mailtrap)");
      }
      console.log("OTP for", parsed.data.email, "is", otp);
    } catch (e) {
      console.error("Mail error", e);
    }
  }

  res.json({
    message: "If that email belongs to an active VendorBridge account, an OTP has been sent."
  });
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid data.", errors: parsed.error.flatten() });
    return;
  }

  const record = otpStore.get(parsed.data.email);
  if (!record || record.otp !== parsed.data.otp || record.expiresAt < Date.now()) {
    res.status(400).json({ message: "Invalid or expired OTP." });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [passwordHash, parsed.data.email]);
  
  otpStore.delete(parsed.data.email);

  res.json({ message: "Password has been reset successfully." });
});

authRouter.post("/logout", (_req, res) => {
  clearRefreshCookie(res);
  res.status(204).send();
});

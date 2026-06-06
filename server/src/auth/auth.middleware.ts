import type { NextFunction, Request, Response } from "express";
import type { Role } from "../domain/types.js";
import { findUserById, toAuthUser } from "./auth.repository.js";
import { verifyAccessToken } from "./auth.tokens.js";
import type { AuthUser } from "./auth.types.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

function getBearerToken(req: Request) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ message: "Invalid session." });
      return;
    }

    const user = await findUserById(payload.userId);

    if (!user || user.status !== "ACTIVE") {
      res.status(401).json({ message: "User is not active." });
      return;
    }

    req.user = toAuthUser(user);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function requireRoles(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }

    next();
  };
}

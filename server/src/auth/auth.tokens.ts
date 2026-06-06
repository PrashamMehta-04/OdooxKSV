import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../domain/types.js";
import type { AuthTokenPayload, AuthUser } from "./auth.types.js";

const accessExpiresIn = env.jwtAccessTtl as SignOptions["expiresIn"];
const refreshExpiresIn = env.jwtRefreshTtl as SignOptions["expiresIn"];

export function createAccessToken(user: Pick<AuthUser, "id" | "role">) {
  const payload: AuthTokenPayload = {
    userId: user.id,
    role: user.role,
    tokenType: "access"
  };

  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: accessExpiresIn });
}

export function createRefreshToken(user: Pick<AuthUser, "id" | "role">) {
  const payload: AuthTokenPayload = {
    userId: user.id,
    role: user.role,
    tokenType: "refresh"
  };

  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: refreshExpiresIn });
}

function isRole(value: unknown): value is Role {
  return (
    value === "ADMIN" ||
    value === "PROCUREMENT_OFFICER" ||
    value === "VENDOR" ||
    value === "MANAGER"
  );
}

function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.userId === "string" &&
    isRole(payload.role) &&
    (payload.tokenType === "access" || payload.tokenType === "refresh")
  );
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, env.jwtAccessSecret);

  if (!isAuthTokenPayload(decoded) || decoded.tokenType !== "access") {
    return null;
  }

  return decoded;
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, env.jwtRefreshSecret);

  if (!isAuthTokenPayload(decoded) || decoded.tokenType !== "refresh") {
    return null;
  }

  return decoded;
}

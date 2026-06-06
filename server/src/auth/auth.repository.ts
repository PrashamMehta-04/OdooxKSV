import { db } from "../db/client.js";
import type { Role, UserStatus } from "../domain/types.js";
import type { AuthUser } from "./auth.types.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  created_at: Date;
}

export interface UserWithPassword extends AuthUser {
  passwordHash: string;
}

function mapUser(row: UserRow): UserWithPassword {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: row.created_at.toISOString()
  };
}

export function toAuthUser(user: UserWithPassword): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  };
}

export async function findUserByEmail(email: string) {
  const result = await db.query<UserRow>(
    `SELECT id, name, email, password_hash, role, status, created_at
     FROM users
     WHERE lower(email) = lower($1)`,
    [email]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserById(id: string) {
  const result = await db.query<UserRow>(
    `SELECT id, name, email, password_hash, role, status, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}) {
  const result = await db.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, lower($2), $3, $4, 'ACTIVE')
     RETURNING id, name, email, password_hash, role, status, created_at`,
    [input.name, input.email, input.passwordHash, input.role]
  );

  return mapUser(result.rows[0]);
}

import type { Role, UserStatus } from "../domain/types.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  role: Role;
  tokenType: "access" | "refresh";
}

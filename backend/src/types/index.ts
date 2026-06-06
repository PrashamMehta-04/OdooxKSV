import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  vendorId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

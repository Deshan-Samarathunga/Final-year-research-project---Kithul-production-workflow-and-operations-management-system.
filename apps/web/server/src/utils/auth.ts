import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export type AuthTokenPayload = {
  sub: number;
  userId: string;
  displayName: string;
  kind?: "admin" | "employee";
  role?: string;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" });
}

export function signMobileToken(payload: AuthTokenPayload) {
  return jwt.sign({ ...payload, kind: "employee" }, env.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as unknown as AuthTokenPayload;
}

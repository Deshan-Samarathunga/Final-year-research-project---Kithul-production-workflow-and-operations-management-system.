import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { AppError } from "../utils/http.js";
import { verifyAuthToken } from "../utils/auth.js";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number;
        userId: string;
        displayName: string;
        email: string;
      };
    }
  }
}

export async function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  try {
    const bearer = request.header("authorization")?.replace(/^Bearer\s+/i, "");
    const token = request.cookies?.kithulflow_token ?? bearer;

    if (!token) {
      throw new AppError(401, "Authentication required");
    }

    const payload = verifyAuthToken(token);
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });

    if (!admin) {
      throw new AppError(401, "Authentication required");
    }

    request.admin = {
      id: admin.id,
      userId: admin.userId,
      displayName: admin.displayName,
      email: admin.email
    };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Authentication required"));
  }
}

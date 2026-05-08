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
      mobileEmployee?: {
        id: number;
        userId: string;
        displayName: string;
        role: string;
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

export async function requireMobileEmployee(request: Request, _response: Response, next: NextFunction) {
  try {
    const bearer = request.header("authorization")?.replace(/^Bearer\s+/i, "");

    if (!bearer) {
      throw new AppError(401, "Mobile authentication required");
    }

    const payload = verifyAuthToken(bearer);
    const employee = await prisma.employee.findUnique({ where: { id: payload.sub } });

    if (
      !employee ||
      employee.status !== "Active" ||
      employee.role !== "Field Collection" ||
      payload.kind !== "employee"
    ) {
      throw new AppError(401, "Mobile authentication required");
    }

    request.mobileEmployee = {
      id: employee.id,
      userId: employee.userId,
      displayName: employee.fullName,
      role: employee.role
    };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Mobile authentication required"));
  }
}

import { Router } from "express";
import { z } from "zod";
import { env } from "../env.js";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../utils/http.js";
import { signAuthToken, verifyPassword } from "../utils/auth.js";

const router = Router();

const loginSchema = z.object({
  userId: z.string().trim().min(1),
  password: z.string().min(1)
});

router.post(
  "/login",
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [{ userId: payload.userId }, { email: payload.userId }]
      }
    });

    if (!admin || !(await verifyPassword(payload.password, admin.passwordHash))) {
      throw new AppError(401, "Invalid user ID or password");
    }

    const token = signAuthToken({
      sub: admin.id,
      userId: admin.userId,
      displayName: admin.displayName
    });

    const isProduction = env.NODE_ENV === "production";

    response.cookie("kithulflow_token", token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000
    });

    response.json({
      user: {
        id: admin.id,
        userId: admin.userId,
        email: admin.email,
        displayName: admin.displayName
      }
    });
  })
);

router.post("/logout", (_request, response) => {
  response.clearCookie("kithulflow_token");
  response.status(204).send();
});

router.get("/me", requireAdmin, (request, response) => {
  response.json({ user: request.admin });
});

export { router as authRouter };

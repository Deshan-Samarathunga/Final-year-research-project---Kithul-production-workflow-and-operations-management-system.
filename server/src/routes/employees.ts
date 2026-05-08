import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, AppError, pagination } from "../utils/http.js";
import { hashPassword } from "../utils/auth.js";

const router = Router();

const employeeSelect = {
  id: true,
  userId: true,
  fullName: true,
  role: true,
  status: true,
  defaultLogin: true,
  createdAt: true,
  updatedAt: true
};

const employeeRoles = [
  "Field Collection",
  "Inventory Management",
  "Order Management",
  "Finance Management",
  "Labeling",
  "Packaging",
  "Processing"
] as const;

const statuses = ["Active", "Inactive"] as const;

const createEmployeeSchema = z.object({
  userId: z.string().trim().min(3).max(40),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(6).max(120),
  role: z.enum(employeeRoles),
  status: z.enum(statuses).default("Active"),
  defaultLogin: z.boolean().default(true)
});

const updateEmployeeSchema = createEmployeeSchema
  .omit({ password: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const passwordSchema = z
  .object({
    password: z.string().min(6).max(120),
    confirmPassword: z.string().min(6).max(120)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

async function clearDefaultLogin(role?: string, currentEmployeeId?: number) {
  if (!role) return;

  await prisma.employee.updateMany({
    where: {
      role,
      ...(currentEmployeeId ? { id: { not: currentEmployeeId } } : {})
    },
    data: { defaultLogin: false }
  });
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, pageSize, skip, take } = pagination(request.query);
    const search = String(request.query.search ?? "").trim();
    const where = search
      ? {
          OR: [
            { userId: { contains: search, mode: "insensitive" as const } },
            { fullName: { contains: search, mode: "insensitive" as const } },
            { role: { contains: search, mode: "insensitive" as const } },
            { status: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: employeeSelect,
        orderBy: { id: "asc" },
        skip,
        take
      }),
      prisma.employee.count({ where })
    ]);

    response.json({
      data,
      page,
      pageSize,
      total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1)
    });
  })
);

router.post(
  "/",
  asyncHandler(async (request, response) => {
    const payload = createEmployeeSchema.parse(request.body);

    if (payload.defaultLogin) {
      await clearDefaultLogin(payload.role);
    }

    const employee = await prisma.employee.create({
      data: {
        userId: payload.userId,
        fullName: payload.fullName,
        role: payload.role,
        status: payload.status,
        passwordHash: await hashPassword(payload.password),
        defaultLogin: payload.defaultLogin
      },
      select: employeeSelect
    });

    response.status(201).json(employee);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const payload = updateEmployeeSchema.parse(request.body);

    if (payload.defaultLogin) {
      const targetRole =
        payload.role ?? (await prisma.employee.findUniqueOrThrow({ where: { id }, select: { role: true } })).role;
      await clearDefaultLogin(targetRole, id);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: payload,
      select: employeeSelect
    });

    response.json(employee);
  })
);

router.patch(
  "/:id/password",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const payload = passwordSchema.parse(request.body);

    await prisma.employee.update({
      where: { id },
      data: { passwordHash: await hashPassword(payload.password) }
    });

    response.status(204).send();
  })
);

router.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      throw new AppError(404, "Employee not found");
    }

    await prisma.employee.delete({ where: { id } });
    response.status(204).send();
  })
);

export { employeeRoles, router as employeesRouter };

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, AppError, pagination } from "../utils/http.js";

const router = Router();

const centerStatuses = ["Active", "Inactive"] as const;

const centerSchema = z.object({
  centerId: z.string().trim().min(2).max(40),
  location: z.string().trim().min(2).max(120),
  agent: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  status: z.enum(centerStatuses).default("Active")
});

const updateCenterSchema = centerSchema
  .omit({ centerId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, pageSize, skip, take } = pagination(request.query);
    const search = String(request.query.search ?? "").trim();
    const where = search
      ? {
          OR: [
            { centerId: { contains: search, mode: "insensitive" as const } },
            { location: { contains: search, mode: "insensitive" as const } },
            { agent: { contains: search, mode: "insensitive" as const } },
            { contactPhone: { contains: search, mode: "insensitive" as const } },
            { status: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.center.findMany({
        where,
        orderBy: { id: "asc" },
        skip,
        take
      }),
      prisma.center.count({ where })
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
    const payload = centerSchema.parse(request.body);
    const center = await prisma.center.create({ data: payload });
    response.status(201).json(center);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const payload = updateCenterSchema.parse(request.body);
    const center = await prisma.center.update({
      where: { id: Number(request.params.id) },
      data: payload
    });
    response.json(center);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const center = await prisma.center.findUnique({ where: { id } });

    if (!center) {
      throw new AppError(404, "Center not found");
    }

    await prisma.center.delete({ where: { id } });
    response.status(204).send();
  })
);

export { router as centersRouter };

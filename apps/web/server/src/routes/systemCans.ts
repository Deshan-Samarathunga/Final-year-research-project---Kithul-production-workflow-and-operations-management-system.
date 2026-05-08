import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, AppError, pagination } from "../utils/http.js";

const router = Router();

const canStatuses = ["In warehouse", "Dispatched", "Lost", "Retired"] as const;

const canSchema = z.object({
  canCode: z.string().trim().min(2).max(40),
  status: z.enum(canStatuses).default("In warehouse"),
  agentName: z.string().trim().max(120).optional().nullable(),
  reference: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(240).optional().nullable()
});

const updateCanSchema = canSchema
  .omit({ canCode: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

function canOrderCode(canCode: string) {
  const match = canCode.match(/\d+$/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, pageSize } = pagination(request.query);
    const search = String(request.query.search ?? "").trim();
    const where = search
      ? {
          OR: [
            { canCode: { contains: search, mode: "insensitive" as const } },
            { status: { contains: search, mode: "insensitive" as const } },
            { agentName: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [allData, total] = await Promise.all([
      prisma.systemCan.findMany({
        where,
        orderBy: { canCode: "asc" }
      }),
      prisma.systemCan.count({ where })
    ]);

    const sorted = allData.sort((a, b) => canOrderCode(a.canCode) - canOrderCode(b.canCode));
    const start = (page - 1) * pageSize;

    response.json({
      data: sorted.slice(start, start + pageSize),
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
    const payload = canSchema.parse(request.body);
    const now = new Date();
    const can = await prisma.systemCan.create({
      data: {
        canCode: payload.canCode,
        status: payload.status,
        agentName: payload.agentName,
        reference: payload.reference,
        lastUpdated: now,
        histories: {
          create: {
            status: payload.status,
            agentName: payload.agentName,
            reference: payload.reference,
            note: payload.note ?? "Can created",
            createdAt: now
          }
        }
      }
    });

    response.status(201).json(can);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const payload = updateCanSchema.parse(request.body);
    const now = new Date();

    const can = await prisma.systemCan.update({
      where: { id },
      data: {
        status: payload.status,
        agentName: payload.agentName,
        reference: payload.reference,
        lastUpdated: now,
        histories: {
          create: {
            status: payload.status ?? "Updated",
            agentName: payload.agentName,
            reference: payload.reference,
            note: payload.note ?? "Can updated",
            createdAt: now
          }
        }
      }
    });

    response.json(can);
  })
);

router.get(
  "/:id/history",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const can = await prisma.systemCan.findUnique({
      where: { id },
      include: {
        histories: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!can) {
      throw new AppError(404, "Can not found");
    }

    response.json(can);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const can = await prisma.systemCan.findUnique({ where: { id } });

    if (!can) {
      throw new AppError(404, "Can not found");
    }

    await prisma.systemCan.delete({ where: { id } });
    response.status(204).send();
  })
);

export { router as systemCansRouter };

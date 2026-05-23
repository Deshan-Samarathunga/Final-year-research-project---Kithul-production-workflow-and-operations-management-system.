import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, AppError, pagination } from "../utils/http.js";

const router = Router();

const canStatuses = ["In warehouse", "Dispatched", "Collected"] as const;

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

function parseDateFilter(value: unknown, endOfDay = false) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, pageSize } = pagination(request.query);
    const search = String(request.query.search ?? "").trim();
    const canCode = String(request.query.canCode ?? "").trim();
    const status = String(request.query.status ?? "").trim();
    const agentName = String(request.query.agentName ?? "").trim();
    const reference = String(request.query.reference ?? "").trim();
    const updatedFrom = parseDateFilter(request.query.updatedFrom);
    const updatedTo = parseDateFilter(request.query.updatedTo, true);
    const where: Prisma.SystemCanWhereInput = {
      ...(search
        ? {
            OR: [
              { canCode: { contains: search, mode: "insensitive" } },
              { status: { contains: search, mode: "insensitive" } },
              { agentName: { contains: search, mode: "insensitive" } },
              { reference: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(canCode ? { canCode: { contains: canCode, mode: "insensitive" } } : {}),
      ...(status ? { status } : {}),
      ...(agentName === "__NULL__" ? { agentName: null } : agentName ? { agentName } : {}),
      ...(reference ? { reference: { contains: reference, mode: "insensitive" } } : {}),
      ...(updatedFrom || updatedTo
        ? {
            lastUpdated: {
              ...(updatedFrom ? { gte: updatedFrom } : {}),
              ...(updatedTo ? { lte: updatedTo } : {})
            }
          }
        : {})
    };

    const [allData, total, statusCounts, agentCounts] = await Promise.all([
      prisma.systemCan.findMany({
        where,
        orderBy: { canCode: "asc" }
      }),
      prisma.systemCan.count({ where }),
      prisma.systemCan.groupBy({ by: ["status"], where, _count: { _all: true }, orderBy: { status: "asc" } }),
      prisma.systemCan.groupBy({ by: ["agentName"], where, _count: { _all: true }, orderBy: { agentName: "asc" } })
    ]);

    const sorted = allData.sort((a, b) => canOrderCode(a.canCode) - canOrderCode(b.canCode));
    const start = (page - 1) * pageSize;

    response.json({
      data: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      facets: {
        statuses: statusCounts.map((item) => ({ value: item.status, count: item._count._all })),
        agents: agentCounts.map((item) => ({ value: item.agentName ?? "__NULL__", count: item._count._all }))
      }
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

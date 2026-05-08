import { Router } from "express";
import { Prisma } from "@prisma/client";
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
    const centerId = String(request.query.centerId ?? "").trim();
    const location = String(request.query.location ?? "").trim();
    const agent = String(request.query.agent ?? "").trim();
    const contact = String(request.query.contact ?? "").trim();
    const status = String(request.query.status ?? "").trim();
    const where: Prisma.CenterWhereInput = {
      ...(search
        ? {
            OR: [
              { centerId: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { agent: { contains: search, mode: "insensitive" } },
              { contactPhone: { contains: search, mode: "insensitive" } },
              { status: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(centerId ? { centerId: { contains: centerId, mode: "insensitive" } } : {}),
      ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
      ...(agent ? { agent } : {}),
      ...(contact ? { contactPhone: { contains: contact, mode: "insensitive" } } : {}),
      ...(status ? { status } : {})
    };

    const [data, total, agentCounts, statusCounts] = await Promise.all([
      prisma.center.findMany({
        where,
        orderBy: { id: "asc" },
        skip,
        take
      }),
      prisma.center.count({ where }),
      prisma.center.groupBy({ by: ["agent"], where, _count: { _all: true }, orderBy: { agent: "asc" } }),
      prisma.center.groupBy({ by: ["status"], where, _count: { _all: true }, orderBy: { status: "asc" } })
    ]);

    response.json({
      data,
      page,
      pageSize,
      total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      facets: {
        agents: agentCounts.map((item) => ({ value: item.agent, count: item._count._all })),
        statuses: statusCounts.map((item) => ({ value: item.status, count: item._count._all }))
      }
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

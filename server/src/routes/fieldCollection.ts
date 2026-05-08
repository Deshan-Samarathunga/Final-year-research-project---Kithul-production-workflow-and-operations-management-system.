import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, pagination } from "../utils/http.js";

const router = Router();

const issueNoteTypes = ["Field collection", "Direct collection", "Transfer return"] as const;
const issueNoteStatuses = ["Active", "Completed"] as const;

const issueNoteSchema = z.object({
  issueNoteName: z.string().trim().min(2).max(120),
  collectionDate: z.coerce.date(),
  centerId: z.number().int().positive(),
  type: z.enum(issueNoteTypes)
});

const updateIssueNoteSchema = z
  .object({
    issueNoteName: z.string().trim().min(2).max(120).optional(),
    collectionDate: z.coerce.date().optional(),
    centerId: z.number().int().positive().optional(),
    type: z.enum(issueNoteTypes).optional(),
    status: z.enum(issueNoteStatuses).optional(),
    canCount: z.number().int().min(0).optional(),
    totalQty: z.number().min(0).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

router.get(
  "/issue-notes",
  asyncHandler(async (request, response) => {
    const { page, pageSize, skip, take } = pagination(request.query);
    const status = String(request.query.status ?? "Active");
    const search = String(request.query.search ?? "").trim();
    const where = {
      status,
      ...(search
        ? {
            OR: [
              { issueNoteName: { contains: search, mode: "insensitive" as const } },
              { type: { contains: search, mode: "insensitive" as const } },
              { center: { agent: { contains: search, mode: "insensitive" as const } } },
              { center: { centerId: { contains: search, mode: "insensitive" as const } } }
            ]
          }
        : {})
    };

    const [data, total, active, completed] = await Promise.all([
      prisma.issueNote.findMany({
        where,
        include: { center: true },
        orderBy: { collectionDate: "desc" },
        skip,
        take
      }),
      prisma.issueNote.count({ where }),
      prisma.issueNote.count({ where: { status: "Active" } }),
      prisma.issueNote.count({ where: { status: "Completed" } })
    ]);

    response.json({
      data,
      counts: { active, completed },
      page,
      pageSize,
      total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1)
    });
  })
);

router.post(
  "/issue-notes",
  asyncHandler(async (request, response) => {
    const payload = issueNoteSchema.parse(request.body);
    const issueNote = await prisma.issueNote.create({
      data: {
        ...payload,
        status: "Active",
        canCount: 0,
        totalQty: 0
      },
      include: { center: true }
    });

    response.status(201).json(issueNote);
  })
);

router.patch(
  "/issue-notes/:id",
  asyncHandler(async (request, response) => {
    const payload = updateIssueNoteSchema.parse(request.body);
    const issueNote = await prisma.issueNote.update({
      where: { id: Number(request.params.id) },
      data: payload,
      include: { center: true }
    });

    response.json(issueNote);
  })
);

export { router as fieldCollectionRouter };

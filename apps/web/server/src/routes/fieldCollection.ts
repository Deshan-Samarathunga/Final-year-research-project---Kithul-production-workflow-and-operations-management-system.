import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, pagination } from "../utils/http.js";

const router = Router();

const issueNoteStatuses = ["Active", "Completed"] as const;

const issueNoteSchema = z.object({
  issueNoteName: z.string().trim().min(2).max(120),
  collectionDate: z.coerce.date(),
  centerId: z.number().int().positive(),
  type: z.string().trim().min(2).max(80)
});

const updateIssueNoteSchema = z
  .object({
    issueNoteName: z.string().trim().min(2).max(120).optional(),
    collectionDate: z.coerce.date().optional(),
    centerId: z.number().int().positive().optional(),
    type: z.string().trim().min(2).max(80).optional(),
    status: z.enum(issueNoteStatuses).optional(),
    canCount: z.number().int().min(0).optional(),
    totalQty: z.number().min(0).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const mobileIssueWhere: Prisma.IssueNoteWhereInput = {
  deletedAt: null,
  OR: [{ mobileLocalId: { not: null } }, { submittedByEmployeeId: { not: null } }]
};

const mobileTransferWhere: Prisma.TransferNoteWhereInput = {
  deletedAt: null,
  OR: [{ mobileLocalId: { not: null } }, { submittedByEmployeeId: { not: null } }]
};

router.get(
  "/monitor",
  asyncHandler(async (_request, response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      latestSuccessfulSync,
      syncEvents,
      receivedIssueNotesToday,
      receivedCanRowsToday,
      activeMobileNotes,
      failedSyncsToday,
      issueNotes,
      issueNoteItems,
      transferNotes
    ] = await Promise.all([
      prisma.mobileSyncEvent.findFirst({
        where: { status: "Success" },
        include: { employee: true },
        orderBy: { completedAt: "desc" }
      }),
      prisma.mobileSyncEvent.findMany({
        include: { employee: true },
        orderBy: { startedAt: "desc" },
        take: 20
      }),
      prisma.issueNote.count({
        where: {
          ...mobileIssueWhere,
          createdAt: { gte: today }
        }
      }),
      prisma.issueNoteItem.count({
        where: {
          deletedAt: null,
          createdAt: { gte: today },
          issueNote: { is: mobileIssueWhere }
        }
      }),
      prisma.issueNote.count({
        where: {
          ...mobileIssueWhere,
          status: "Active"
        }
      }),
      prisma.mobileSyncEvent.count({
        where: {
          status: "Failed",
          startedAt: { gte: today }
        }
      }),
      prisma.issueNote.findMany({
        where: mobileIssueWhere,
        include: {
          center: true,
          submittedByEmployee: true,
          items: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }
        },
        orderBy: { updatedAt: "desc" },
        take: 15
      }),
      prisma.issueNoteItem.findMany({
        where: {
          deletedAt: null,
          issueNote: { is: mobileIssueWhere }
        },
        include: {
          issueNote: {
            include: {
              center: true,
              submittedByEmployee: true
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      }),
      prisma.transferNote.findMany({
        where: mobileTransferWhere,
        include: {
          center: true,
          submittedByEmployee: true,
          items: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }
        },
        orderBy: { updatedAt: "desc" },
        take: 15
      })
    ]);

    response.json({
      serverTime: new Date().toISOString(),
      metrics: {
        lastSyncAt: latestSuccessfulSync?.completedAt ?? latestSuccessfulSync?.startedAt ?? null,
        lastSyncEmployee: latestSuccessfulSync?.employee?.fullName ?? null,
        receivedIssueNotesToday,
        receivedCanRowsToday,
        activeMobileNotes,
        failedSyncsToday
      },
      latestSuccessfulSync,
      syncEvents,
      issueNotes,
      issueNoteItems,
      transferNotes
    });
  })
);

router.get(
  "/issue-notes",
  asyncHandler(async (request, response) => {
    const { page, pageSize, skip, take } = pagination(request.query);
    const status = String(request.query.status ?? "Active");
    const search = String(request.query.search ?? "").trim();
    const where = {
      status,
      deletedAt: null,
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
        include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
        orderBy: { collectionDate: "desc" },
        skip,
        take
      }),
      prisma.issueNote.count({ where }),
      prisma.issueNote.count({ where: { status: "Active", deletedAt: null } }),
      prisma.issueNote.count({ where: { status: "Completed", deletedAt: null } })
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
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
    });

    response.status(201).json(issueNote);
  })
);

router.get(
  "/issue-notes/:id",
  asyncHandler(async (request, response) => {
    const issueNote = await prisma.issueNote.findFirst({
      where: { id: Number(request.params.id), deletedAt: null },
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
    });

    if (!issueNote) {
      response.status(404).json({ message: "Issue note not found" });
      return;
    }

    response.json(issueNote);
  })
);

router.patch(
  "/issue-notes/:id",
  asyncHandler(async (request, response) => {
    const payload = updateIssueNoteSchema.parse(request.body);
    const issueNote = await prisma.issueNote.update({
      where: { id: Number(request.params.id) },
      data: payload,
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
    });

    response.json(issueNote);
  })
);

router.get(
  "/transfer-notes",
  asyncHandler(async (request, response) => {
    const { page, pageSize, skip, take } = pagination(request.query);
    const status = String(request.query.status ?? "Active");
    const search = String(request.query.search ?? "").trim();
    const where = {
      status,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { transferNoteNo: { contains: search, mode: "insensitive" as const } },
              { center: { agent: { contains: search, mode: "insensitive" as const } } },
              { center: { centerId: { contains: search, mode: "insensitive" as const } } }
            ]
          }
        : {})
    };

    const [data, total, active, completed] = await Promise.all([
      prisma.transferNote.findMany({
        where,
        include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
        orderBy: { transferDate: "desc" },
        skip,
        take
      }),
      prisma.transferNote.count({ where }),
      prisma.transferNote.count({ where: { status: "Active", deletedAt: null } }),
      prisma.transferNote.count({ where: { status: "Completed", deletedAt: null } })
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

router.get(
  "/transfer-notes/:id",
  asyncHandler(async (request, response) => {
    const transferNote = await prisma.transferNote.findFirst({
      where: { id: Number(request.params.id), deletedAt: null },
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
    });

    if (!transferNote) {
      response.status(404).json({ message: "Transfer note not found" });
      return;
    }

    response.json(transferNote);
  })
);

export { router as fieldCollectionRouter };

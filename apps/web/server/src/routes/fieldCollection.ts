import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncHandler, AppError, pagination } from "../utils/http.js";

const router = Router();

const issueNoteStatuses = ["Active", "Completed"] as const;
const qualityCheckDecisions = ["Accepted", "Spoiled"] as const;
const sapQualityWarningLimits = {
  ph: { min: 5.5, max: 6.5 },
  brix: { min: 9.5, max: 12 },
  temperatureC: { min: 4, max: 35 }
};

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

const transferNoteSchema = z.object({
  transferNoteNo: z.string().trim().min(2).max(120),
  transferDate: z.coerce.date(),
  centerId: z.number().int().positive()
});

const updateTransferNoteSchema = z
  .object({
    transferNoteNo: z.string().trim().min(2).max(120).optional(),
    transferDate: z.coerce.date().optional(),
    centerId: z.number().int().positive().optional(),
    status: z.enum(issueNoteStatuses).optional(),
    canCount: z.number().int().min(0).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const transferNoteItemSchema = z.object({
  canCode: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((value) => value.toUpperCase())
});

const issueNoteItemSchema = transferNoteItemSchema.extend({
  quantity: z.coerce.number().positive(),
  phValue: z.coerce.number().min(0),
  brixValue: z.coerce.number().min(0),
  temperatureC: z.coerce.number().min(0).optional().nullable()
});

const qualityCheckSchema = z.object({
  phValue: z.coerce.number().min(0),
  brixValue: z.coerce.number().min(0),
  temperatureC: z.coerce.number().min(0),
  decision: z.enum(qualityCheckDecisions),
  reason: z.string().trim().max(240).optional().nullable(),
  checkedAt: z.coerce.date().optional()
});

const latestQualityCheckInclude = {
  processingQualityChecks: {
    orderBy: { checkedAt: "desc" as const },
    take: 1
  }
};

const mobileIssueWhere: Prisma.IssueNoteWhereInput = {
  deletedAt: null,
  OR: [{ mobileLocalId: { not: null } }, { submittedByEmployeeId: { not: null } }]
};

const mobileTransferWhere: Prisma.TransferNoteWhereInput = {
  deletedAt: null,
  OR: [{ mobileLocalId: { not: null } }, { submittedByEmployeeId: { not: null } }]
};

function stringParam(value: unknown) {
  return String(value ?? "").trim();
}

function dateRange(from: string, to: string) {
  const range: Prisma.DateTimeFilter = {};

  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) range.gte = fromDate;
  }

  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      range.lte = toDate;
    }
  }

  return Object.keys(range).length > 0 ? range : undefined;
}

function countFacets(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, count]) => ({ value, count }));
}

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
          items: { where: { deletedAt: null }, include: latestQualityCheckInclude, orderBy: { createdAt: "desc" } }
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
          ...latestQualityCheckInclude,
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
    const status = stringParam(request.query.status || "Active");
    const search = stringParam(request.query.search);
    const issueNote = stringParam(request.query.issueNote);
    const type = stringParam(request.query.type);
    const centerAgent = stringParam(request.query.centerAgent);
    const collectionRange = dateRange(stringParam(request.query.collectionFrom), stringParam(request.query.collectionTo));
    const where: Prisma.IssueNoteWhereInput = {
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
        : {}),
      ...(issueNote ? { issueNoteName: { contains: issueNote, mode: "insensitive" } } : {}),
      ...(type ? { type } : {}),
      ...(centerAgent ? { center: { agent: centerAgent } } : {}),
      ...(collectionRange ? { collectionDate: collectionRange } : {})
    };

    const [data, total, active, completed, typeCounts, agentRows] = await Promise.all([
      prisma.issueNote.findMany({
        where,
        include: { center: true, items: { where: { deletedAt: null }, include: latestQualityCheckInclude, orderBy: { createdAt: "asc" } } },
        orderBy: { collectionDate: "desc" },
        skip,
        take
      }),
      prisma.issueNote.count({ where }),
      prisma.issueNote.count({ where: { status: "Active", deletedAt: null } }),
      prisma.issueNote.count({ where: { status: "Completed", deletedAt: null } }),
      prisma.issueNote.groupBy({ by: ["type"], where, _count: { _all: true }, orderBy: { type: "asc" } }),
      prisma.issueNote.findMany({ where, select: { center: { select: { agent: true } } } })
    ]);

    response.json({
      data,
      counts: { active, completed },
      page,
      pageSize,
      total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      facets: {
        types: typeCounts.map((item) => ({ value: item.type, count: item._count._all })),
        agents: countFacets(agentRows.map((row) => row.center?.agent))
      }
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

router.post(
  "/issue-notes/:id/items",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const payload = issueNoteItemSchema.parse(request.body);
    const issueNote = await prisma.$transaction(async (tx) => {
      const existing = await tx.issueNote.findFirst({ where: { id, deletedAt: null } });

      if (!existing) {
        throw new AppError(404, "Issue note not found");
      }

      if (existing.status !== "Active") {
        throw new AppError(400, "Only active issue notes can be edited");
      }

      const systemCan = await tx.systemCan.findUnique({ where: { canCode: payload.canCode } });

      if (!systemCan) {
        throw new AppError(400, "Only registered system cans can be added");
      }

      if (systemCan.status !== "In warehouse") {
        throw new AppError(400, "Only in-warehouse system cans can be added");
      }

      if (existing.type === "Sap" && payload.temperatureC == null) {
        throw new AppError(400, "Temperature is required for Sap issue notes");
      }

      await tx.issueNoteItem.create({
        data: {
          issueNoteId: id,
          canCode: payload.canCode,
          quantity: payload.quantity,
          phValue: payload.phValue,
          brixValue: payload.brixValue,
          temperatureC: payload.temperatureC ?? null,
          processingStatus: "Pending"
        }
      });

      return refreshIssueTotals(tx, id);
    });

    response.status(201).json(issueNote);
  })
);

router.delete(
  "/issue-notes/:id/items/:itemId",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const itemId = Number(request.params.itemId);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.issueNote.findFirst({ where: { id, deletedAt: null } });

      if (!existing) {
        throw new AppError(404, "Issue note not found");
      }

      if (existing.status !== "Active") {
        throw new AppError(400, "Only active issue notes can be edited");
      }

      const deleted = await tx.issueNoteItem.updateMany({
        where: { id: itemId, issueNoteId: id, deletedAt: null },
        data: { deletedAt: new Date() }
      });

      if (deleted.count === 0) {
        throw new AppError(404, "Issue can not found");
      }

      await refreshIssueTotals(tx, id);
    });

    response.status(204).send();
  })
);

router.post(
  "/issue-note-items/:itemId/quality-checks",
  asyncHandler(async (request, response) => {
    const itemId = Number(request.params.itemId);
    const payload = qualityCheckSchema.parse(request.body);
    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.issueNoteItem.findFirst({
        where: { id: itemId, deletedAt: null },
        include: { issueNote: true }
      });

      if (!item) {
        throw new AppError(404, "Issue can not found");
      }

      if (item.issueNote.type !== "Sap") {
        throw new AppError(400, "Processing quality checks are only available for Sap issue notes");
      }

      const warnings = qualityWarnings(payload);
      const check = await tx.processingQualityCheck.create({
        data: {
          issueNoteItemId: itemId,
          phValue: payload.phValue,
          brixValue: payload.brixValue,
          temperatureC: payload.temperatureC,
          decision: payload.decision,
          reason: payload.reason || null,
          checkedAt: payload.checkedAt ?? new Date(),
          ...warnings
        }
      });

      await tx.issueNoteItem.update({
        where: { id: itemId },
        data: { processingStatus: payload.decision }
      });

      return check;
    });

    response.status(201).json(created);
  })
);

router.post(
  "/issue-note-items/:itemId/return",
  asyncHandler(async (request, response) => {
    const itemId = Number(request.params.itemId);
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.issueNoteItem.findFirst({
        where: { id: itemId, deletedAt: null },
        include: { issueNote: { include: { center: true } } }
      });

      if (!item) {
        throw new AppError(404, "Issue can not found");
      }

      if (item.issueNote.type !== "Sap") {
        throw new AppError(400, "Only Sap issue note cans can be returned from processing quality checks");
      }

      if (item.processingStatus !== "Spoiled") {
        throw new AppError(400, "Only spoiled can rows can be returned");
      }

      const systemCan = await tx.systemCan.findUnique({ where: { canCode: item.canCode } });

      if (!systemCan) {
        throw new AppError(400, "Registered system can not found for this row");
      }

      const now = new Date();
      const reference = item.issueNote.issueNoteName;
      await tx.systemCan.update({
        where: { id: systemCan.id },
        data: {
          status: "In warehouse",
          agentName: item.issueNote.center?.agent ?? null,
          reference,
          lastUpdated: now,
          histories: {
            create: {
              status: "In warehouse",
              agentName: item.issueNote.center?.agent ?? null,
              reference,
              note: "Returned after spoiled processing quality check",
              createdAt: now
            }
          }
        }
      });

      return tx.issueNoteItem.update({
        where: { id: itemId },
        data: { processingStatus: "Returned" },
        include: latestQualityCheckInclude
      });
    });

    response.json(result);
  })
);

router.get(
  "/transfer-notes",
  asyncHandler(async (request, response) => {
    const { page, pageSize, skip, take } = pagination(request.query);
    const status = stringParam(request.query.status || "Active");
    const search = stringParam(request.query.search);
    const transferNote = stringParam(request.query.transferNote);
    const agent = stringParam(request.query.agent);
    const transferRange = dateRange(stringParam(request.query.transferFrom), stringParam(request.query.transferTo));
    const where: Prisma.TransferNoteWhereInput = {
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
        : {}),
      ...(transferNote ? { transferNoteNo: { contains: transferNote, mode: "insensitive" } } : {}),
      ...(agent ? { center: { agent } } : {}),
      ...(transferRange ? { transferDate: transferRange } : {})
    };

    const [data, total, active, completed, agentRows] = await Promise.all([
      prisma.transferNote.findMany({
        where,
        include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
        orderBy: { transferDate: "desc" },
        skip,
        take
      }),
      prisma.transferNote.count({ where }),
      prisma.transferNote.count({ where: { status: "Active", deletedAt: null } }),
      prisma.transferNote.count({ where: { status: "Completed", deletedAt: null } }),
      prisma.transferNote.findMany({ where, select: { center: { select: { agent: true } } } })
    ]);

    response.json({
      data,
      counts: { active, completed },
      page,
      pageSize,
      total,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      facets: {
        agents: countFacets(agentRows.map((row) => row.center?.agent))
      }
    });
  })
);

router.post(
  "/transfer-notes",
  asyncHandler(async (request, response) => {
    const payload = transferNoteSchema.parse(request.body);
    const transferNote = await prisma.transferNote.create({
      data: {
        ...payload,
        status: "Active",
        canCount: 0
      },
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
    });

    response.status(201).json(transferNote);
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

router.patch(
  "/transfer-notes/:id",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const payload = updateTransferNoteSchema.parse(request.body);
    const existing = await prisma.transferNote.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      throw new AppError(404, "Transfer note not found");
    }

    const transferNote = await prisma.transferNote.update({
      where: { id },
      data: payload,
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
    });

    response.json(transferNote);
  })
);

router.post(
  "/transfer-notes/:id/items",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const payload = transferNoteItemSchema.parse(request.body);
    const transferNote = await prisma.$transaction(async (tx) => {
      const existing = await tx.transferNote.findFirst({ where: { id, deletedAt: null } });

      if (!existing) {
        throw new AppError(404, "Transfer note not found");
      }

      if (existing.status !== "Active") {
        throw new AppError(400, "Only active transfer notes can be edited");
      }

      const systemCan = await tx.systemCan.findUnique({ where: { canCode: payload.canCode } });

      if (!systemCan) {
        throw new AppError(400, "Only registered system cans can be added");
      }

      if (systemCan.status !== "In warehouse") {
        throw new AppError(400, "Only in-warehouse system cans can be added");
      }

      await tx.transferNoteItem.create({
        data: {
          transferNoteId: id,
          canCode: payload.canCode
        }
      });

      return refreshTransferCount(tx, id);
    });

    response.status(201).json(transferNote);
  })
);

router.delete(
  "/transfer-notes/:id/items/:itemId",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    const itemId = Number(request.params.itemId);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.transferNote.findFirst({ where: { id, deletedAt: null } });

      if (!existing) {
        throw new AppError(404, "Transfer note not found");
      }

      if (existing.status !== "Active") {
        throw new AppError(400, "Only active transfer notes can be edited");
      }

      const deleted = await tx.transferNoteItem.updateMany({
        where: { id: itemId, transferNoteId: id, deletedAt: null },
        data: { deletedAt: new Date() }
      });

      if (deleted.count === 0) {
        throw new AppError(404, "Transfer can not found");
      }

      await refreshTransferCount(tx, id);
    });

    response.status(204).send();
  })
);

async function refreshTransferCount(tx: Prisma.TransactionClient, transferNoteId: number) {
  const count = await tx.transferNoteItem.count({
    where: { transferNoteId, deletedAt: null }
  });

  return tx.transferNote.update({
    where: { id: transferNoteId },
    data: { canCount: count },
    include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
  });
}

function qualityWarnings(payload: z.infer<typeof qualityCheckSchema>) {
  const phWarning = payload.phValue < sapQualityWarningLimits.ph.min || payload.phValue > sapQualityWarningLimits.ph.max;
  const brixWarning = payload.brixValue < sapQualityWarningLimits.brix.min || payload.brixValue > sapQualityWarningLimits.brix.max;
  const temperatureWarning =
    payload.temperatureC < sapQualityWarningLimits.temperatureC.min || payload.temperatureC > sapQualityWarningLimits.temperatureC.max;
  const messages = [
    phWarning ? `pH outside ${sapQualityWarningLimits.ph.min}-${sapQualityWarningLimits.ph.max}` : "",
    brixWarning ? `Brix outside ${sapQualityWarningLimits.brix.min}-${sapQualityWarningLimits.brix.max}` : "",
    temperatureWarning
      ? `Temperature outside ${sapQualityWarningLimits.temperatureC.min}-${sapQualityWarningLimits.temperatureC.max} C`
      : ""
  ].filter(Boolean);

  return {
    phWarning,
    brixWarning,
    temperatureWarning,
    warningMessage: messages.length > 0 ? messages.join("; ") : null
  };
}

function csvCell(value: unknown) {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function hoursBetween(start: Date | string, end: Date | string) {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";
  return ((endDate.getTime() - startDate.getTime()) / 36e5).toFixed(2);
}

async function refreshIssueTotals(tx: Prisma.TransactionClient, issueNoteId: number) {
  const items = await tx.issueNoteItem.findMany({
    where: { issueNoteId, deletedAt: null }
  });

  return tx.issueNote.update({
    where: { id: issueNoteId },
    data: {
      canCount: items.length,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0)
    },
    include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } }
  });
}

export { router as fieldCollectionRouter };

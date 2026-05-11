import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireMobileEmployee } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../utils/http.js";
import { signMobileToken, verifyPassword } from "../utils/auth.js";

const router = Router();

const loginSchema = z.object({
  userId: z.string().trim().min(1),
  password: z.string().min(1)
});

const mobileIssueNoteSchema = z.object({
  localId: z.string().min(1),
  remoteId: z.string().optional().nullable(),
  issueNoteName: z.string().trim().min(1),
  collectionDate: z.coerce.date(),
  centerLocalId: z.string().optional().nullable(),
  centerRemoteId: z.string().optional().nullable(),
  centerCode: z.string().optional().nullable(),
  type: z.string().trim().min(1),
  status: z.string().trim().min(1),
  canCount: z.number().int().min(0).default(0),
  totalQty: z.number().min(0).default(0),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable()
});

const mobileIssueNoteItemSchema = z.object({
  localId: z.string().min(1),
  remoteId: z.string().optional().nullable(),
  issueNoteLocalId: z.string().min(1),
  canCode: z.string().trim().min(1),
  quantity: z.number().positive(),
  phValue: z.number().min(0).max(14).default(0),
  brixValue: z.number().min(0).default(0),
  temperatureC: z.number().min(0).optional().nullable(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable()
});

const mobileTransferNoteSchema = z.object({
  localId: z.string().min(1),
  remoteId: z.string().optional().nullable(),
  transferNoteNo: z.string().trim().min(1),
  transferDate: z.coerce.date(),
  centerLocalId: z.string().optional().nullable(),
  centerRemoteId: z.string().optional().nullable(),
  centerCode: z.string().optional().nullable(),
  status: z.string().trim().min(1),
  canCount: z.number().int().min(0).default(0),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable()
});

const mobileTransferNoteItemSchema = z.object({
  localId: z.string().min(1),
  remoteId: z.string().optional().nullable(),
  transferNoteLocalId: z.string().min(1),
  canCode: z.string().trim().min(1),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable()
});

const syncSchema = z.object({
  issueNotes: z.array(mobileIssueNoteSchema).default([]),
  issueNoteItems: z.array(mobileIssueNoteItemSchema).default([]),
  transferNotes: z.array(mobileTransferNoteSchema).default([]),
  transferNoteItems: z.array(mobileTransferNoteItemSchema).default([])
});

router.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "kithulflow-mobile-sync",
    serverTime: new Date().toISOString()
  });
});

router.post(
  "/auth/login",
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const employee = await prisma.employee.findUnique({ where: { userId: payload.userId } });

    if (
      !employee ||
      employee.status !== "Active" ||
      employee.role !== "Field Collection" ||
      !(await verifyPassword(payload.password, employee.passwordHash))
    ) {
      throw new AppError(401, "Invalid field collector credentials");
    }

    const token = signMobileToken({
      sub: employee.id,
      userId: employee.userId,
      displayName: employee.fullName,
      role: employee.role
    });

    response.json({
      token,
      user: {
        id: employee.id,
        userId: employee.userId,
        displayName: employee.fullName,
        role: employee.role
      }
    });
  })
);

router.post("/auth/logout", requireMobileEmployee, (_request, response) => {
  response.status(204).send();
});

router.get("/auth/me", requireMobileEmployee, (request, response) => {
  response.json({ user: request.mobileEmployee });
});

router.get(
  "/bootstrap",
  requireMobileEmployee,
  asyncHandler(async (_request, response) => {
    response.json(await buildBootstrap());
  })
);

router.post(
  "/sync",
  requireMobileEmployee,
  asyncHandler(async (request, response) => {
    const startedAt = new Date();
    const employeeId = request.mobileEmployee!.id;
    let changes: z.infer<typeof syncSchema> | null = null;

    try {
      changes = syncSchema.parse(request.body.changes ?? request.body);

      await prisma.$transaction(async (tx) => {
        for (const note of changes!.issueNotes) {
          const centerId = await findCenterId(tx, note.centerRemoteId, note.centerCode);
          await tx.issueNote.upsert({
            where: { mobileLocalId: note.localId },
            update: {
              issueNoteName: note.issueNoteName,
              collectionDate: note.collectionDate,
              centerId,
              submittedByEmployeeId: employeeId,
              type: note.type,
              status: note.status,
              canCount: note.canCount,
              totalQty: note.totalQty,
              deletedAt: note.deletedAt ?? null
            },
            create: {
              mobileLocalId: note.localId,
              issueNoteName: note.issueNoteName,
              collectionDate: note.collectionDate,
              centerId,
              submittedByEmployeeId: employeeId,
              type: note.type,
              status: note.status,
              canCount: note.canCount,
              totalQty: note.totalQty,
              deletedAt: note.deletedAt ?? null
            }
          });
        }

        for (const item of changes!.issueNoteItems) {
          const parent = await tx.issueNote.findUnique({ where: { mobileLocalId: item.issueNoteLocalId } });
          if (!parent) continue;

          await tx.issueNoteItem.upsert({
            where: { mobileLocalId: item.localId },
            update: {
              issueNoteId: parent.id,
              canCode: item.canCode.toUpperCase(),
              quantity: item.quantity,
              phValue: item.phValue,
              brixValue: item.brixValue,
              temperatureC: item.temperatureC ?? null,
              deletedAt: item.deletedAt ?? null
            },
            create: {
              mobileLocalId: item.localId,
              issueNoteId: parent.id,
              canCode: item.canCode.toUpperCase(),
              quantity: item.quantity,
              phValue: item.phValue,
              brixValue: item.brixValue,
              temperatureC: item.temperatureC ?? null,
              deletedAt: item.deletedAt ?? null
            }
          });
          await refreshIssueTotals(tx, parent.id);
        }

        for (const note of changes!.transferNotes) {
          const centerId = await findCenterId(tx, note.centerRemoteId, note.centerCode);
          await tx.transferNote.upsert({
            where: { mobileLocalId: note.localId },
            update: {
              transferNoteNo: note.transferNoteNo,
              transferDate: note.transferDate,
              centerId,
              submittedByEmployeeId: employeeId,
              status: note.status,
              canCount: note.canCount,
              deletedAt: note.deletedAt ?? null
            },
            create: {
              mobileLocalId: note.localId,
              transferNoteNo: note.transferNoteNo,
              transferDate: note.transferDate,
              centerId,
              submittedByEmployeeId: employeeId,
              status: note.status,
              canCount: note.canCount,
              deletedAt: note.deletedAt ?? null
            }
          });
        }

        for (const item of changes!.transferNoteItems) {
          const parent = await tx.transferNote.findUnique({ where: { mobileLocalId: item.transferNoteLocalId } });
          if (!parent) continue;

          await tx.transferNoteItem.upsert({
            where: { mobileLocalId: item.localId },
            update: {
              transferNoteId: parent.id,
              canCode: item.canCode.toUpperCase(),
              deletedAt: item.deletedAt ?? null
            },
            create: {
              mobileLocalId: item.localId,
              transferNoteId: parent.id,
              canCode: item.canCode.toUpperCase(),
              deletedAt: item.deletedAt ?? null
            }
          });
          await refreshTransferCount(tx, parent.id);
        }
      });

      const bootstrap = await buildBootstrap();
      await recordMobileSyncEvent(employeeId, "Success", startedAt, changes);

      response.json({
        acceptedAt: new Date().toISOString(),
        bootstrap
      });
    } catch (error) {
      await recordMobileSyncEvent(employeeId, "Failed", startedAt, changes, errorMessage(error));
      throw error;
    }
  })
);

async function buildBootstrap() {
  const [centers, systemCans, issueNotes, transferNotes] = await Promise.all([
    prisma.center.findMany({
      where: { status: "Active" },
      orderBy: { centerId: "asc" }
    }),
    prisma.systemCan.findMany({
      orderBy: { canCode: "asc" }
    }),
    prisma.issueNote.findMany({
      where: { deletedAt: null },
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
      orderBy: { collectionDate: "desc" }
    }),
    prisma.transferNote.findMany({
      where: { deletedAt: null },
      include: { center: true, items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
      orderBy: { transferDate: "desc" }
    })
  ]);

  return {
    serverTime: new Date().toISOString(),
    centers,
    systemCans,
    issueNotes,
    transferNotes
  };
}

async function findCenterId(
  tx: Prisma.TransactionClient,
  centerRemoteId?: string | null,
  centerCode?: string | null
) {
  const remoteId = Number(centerRemoteId);
  if (Number.isInteger(remoteId) && remoteId > 0) {
    const center = await tx.center.findUnique({ where: { id: remoteId } });
    if (center) return center.id;
  }

  if (centerCode) {
    const center = await tx.center.findUnique({ where: { centerId: centerCode } });
    if (center) return center.id;
  }

  return null;
}

async function refreshIssueTotals(tx: Prisma.TransactionClient, issueNoteId: number) {
  const items = await tx.issueNoteItem.findMany({
    where: { issueNoteId, deletedAt: null }
  });
  await tx.issueNote.update({
    where: { id: issueNoteId },
    data: {
      canCount: items.length,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
}

async function refreshTransferCount(tx: Prisma.TransactionClient, transferNoteId: number) {
  const count = await tx.transferNoteItem.count({
    where: { transferNoteId, deletedAt: null }
  });
  await tx.transferNote.update({
    where: { id: transferNoteId },
    data: { canCount: count }
  });
}

function syncCounts(changes: z.infer<typeof syncSchema> | null) {
  return {
    issueNoteCount: changes?.issueNotes.length ?? 0,
    issueNoteItemCount: changes?.issueNoteItems.length ?? 0,
    transferNoteCount: changes?.transferNotes.length ?? 0,
    transferNoteItemCount: changes?.transferNoteItems.length ?? 0
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function recordMobileSyncEvent(
  employeeId: number,
  status: "Success" | "Failed",
  startedAt: Date,
  changes: z.infer<typeof syncSchema> | null,
  error?: string
) {
  try {
    await prisma.mobileSyncEvent.create({
      data: {
        employeeId,
        status,
        ...syncCounts(changes),
        errorMessage: error ? error.slice(0, 2000) : null,
        startedAt,
        completedAt: new Date()
      }
    });
  } catch {
    // Sync logging must not block the mobile sync response.
  }
}

export { router as mobileRouter };

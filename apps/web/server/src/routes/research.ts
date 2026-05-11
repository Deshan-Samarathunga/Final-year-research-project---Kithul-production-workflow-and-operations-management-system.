import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

/**
 * GET /api/research/spoilage-dataset.csv
 *
 * Export processing quality-check data as CSV for ML model training.
 * This endpoint is intentionally unauthenticated so the Python ML script
 * can fetch training data directly from the web server via HTTP.
 */
router.get(
  "/spoilage-dataset.csv",
  asyncHandler(async (_request, response) => {
    const checks = await prisma.processingQualityCheck.findMany({
      include: {
        issueNoteItem: {
          include: {
            issueNote: {
              include: { center: true }
            }
          }
        }
      },
      orderBy: { checkedAt: "asc" }
    });
    const headers = [
      "issueNoteId",
      "issueNoteName",
      "issueNoteType",
      "collectionDate",
      "centerAgent",
      "canCode",
      "quantity",
      "initialPh",
      "initialBrix",
      "initialTemperatureC",
      "initialMeasuredAt",
      "processingPh",
      "processingBrix",
      "processingTemperatureC",
      "decision",
      "processingStatus",
      "reason",
      "phWarning",
      "brixWarning",
      "temperatureWarning",
      "warningMessage",
      "checkedAt",
      "timeUntilCheckHours"
    ];
    const rows = checks.map((check) => {
      const item = check.issueNoteItem;
      const note = item.issueNote;
      return [
        note.id,
        note.issueNoteName,
        note.type,
        csvDate(note.collectionDate),
        note.center?.agent ?? "",
        item.canCode,
        item.quantity,
        item.phValue,
        item.brixValue,
        item.temperatureC ?? "",
        csvDate(item.createdAt),
        check.phValue,
        check.brixValue,
        check.temperatureC,
        check.decision,
        item.processingStatus,
        check.reason ?? "",
        check.phWarning,
        check.brixWarning,
        check.temperatureWarning,
        check.warningMessage ?? "",
        csvDate(check.checkedAt),
        hoursBetween(item.createdAt, check.checkedAt)
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="spoilage-dataset.csv"');
    response.send(`${csv}\n`);
  })
);

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

export { router as researchRouter };

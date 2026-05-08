import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get(
  "/summary",
  asyncHandler(async (_request, response) => {
    const [fieldActive, fieldCompleted] = await Promise.all([
      prisma.issueNote.count({ where: { status: "Active" } }),
      prisma.issueNote.count({ where: { status: "Completed" } })
    ]);

    response.json({
      cards: [
        {
          key: "field-collection",
          title: "Field Collection",
          total: fieldActive + fieldCompleted,
          tone: "mint",
          badges: [
            { label: "Active", value: fieldActive, tone: "blue" },
            { label: "Completed", value: fieldCompleted, tone: "green" }
          ]
        },
        {
          key: "processing",
          title: "Processing",
          total: 942,
          tone: "warm",
          badges: [
            { label: "Active", value: 6, tone: "blue" },
            { label: "Completed", value: 936, tone: "green" }
          ]
        },
        {
          key: "packaging",
          title: "Packaging",
          total: 935,
          tone: "sky",
          badges: [
            { label: "Active", value: 0, tone: "blue" },
            { label: "Completed", value: 935, tone: "green" }
          ]
        },
        {
          key: "labeling",
          title: "Labeling Batches",
          total: 966,
          tone: "violet",
          badges: [
            { label: "Active", value: 0, tone: "blue" },
            { label: "Completed", value: 966, tone: "green" }
          ]
        },
        {
          key: "order-management",
          title: "Order Management",
          total: 57,
          tone: "rose",
          badges: [
            { label: "Active", value: 0, tone: "blue" },
            { label: "Completed", value: 56, tone: "green" },
            { label: "Canceled", value: 1, tone: "red" }
          ]
        },
        {
          key: "inventory-management",
          title: "Inventory Management",
          total: 56,
          tone: "cyan",
          badges: [
            { label: "Order Queue", value: 1, tone: "yellow" },
            { label: "Active", value: 1, tone: "blue" },
            { label: "Completed", value: 54, tone: "green" }
          ]
        },
        {
          key: "finance",
          title: "Finance",
          total: 54,
          tone: "cream",
          badges: [
            { label: "Inventory Queue", value: 27, tone: "purple" },
            { label: "Active", value: 0, tone: "blue" },
            { label: "Completed", value: 27, tone: "green" }
          ]
        }
      ]
    });
  })
);

export { router as dashboardRouter };

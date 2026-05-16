import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  adminUser: {
    findUnique: vi.fn()
  },
  mobileSyncEvent: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  },
  issueNote: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  issueNoteItem: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  transferNote: {
    findMany: vi.fn()
  }
};

vi.mock("../src/db.js", () => ({
  prisma: mockPrisma
}));

const { createApp } = await import("../src/app.js");

const app = createApp();
const token = jwt.sign(
  {
    sub: 1,
    userId: "admin",
    displayName: "Admin User"
  },
  "replace-this-with-a-long-random-secret"
);

function authed(requestBuilder: request.Test) {
  return requestBuilder.set("Authorization", `Bearer ${token}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.adminUser.findUnique.mockResolvedValue({
    id: 1,
    userId: "admin",
    email: "admin@kithulflow.local",
    displayName: "Admin User"
  });
  mockPrisma.mobileSyncEvent.findFirst.mockResolvedValue({
    id: 1,
    employeeId: 7,
    employee: { id: 7, fullName: "Field Collector" },
    status: "Success",
    issueNoteCount: 1,
    issueNoteItemCount: 1,
    transferNoteCount: 0,
    transferNoteItemCount: 0,
    errorMessage: null,
    startedAt: new Date("2026-05-08T08:00:00.000Z"),
    completedAt: new Date("2026-05-08T08:00:01.000Z")
  });
  mockPrisma.mobileSyncEvent.findMany.mockResolvedValue([]);
  mockPrisma.mobileSyncEvent.count.mockResolvedValue(0);
  mockPrisma.issueNote.count.mockResolvedValue(1);
  mockPrisma.issueNote.findMany.mockResolvedValue([
    {
      id: 20,
      mobileLocalId: "note-local",
      issueNoteName: "Morning sap",
      collectionDate: new Date("2026-05-08T08:00:00.000Z"),
      center: { centerId: "Ajith", agent: "Chathura Maheepala" },
      submittedByEmployeeId: 7,
      submittedByEmployee: { id: 7, fullName: "Field Collector" },
      type: "Sap",
      status: "Completed",
      canCount: 1,
      totalQty: 12.5,
      items: []
    }
  ]);
  mockPrisma.issueNoteItem.count.mockResolvedValue(1);
  mockPrisma.issueNoteItem.findMany.mockResolvedValue([
    {
      id: 30,
      mobileLocalId: "item-local",
      issueNoteId: 20,
      canCode: "AR001",
      quantity: 12.5,
      phValue: 6.2,
      brixValue: 14.8,
      issueNote: {
        id: 20,
        issueNoteName: "Morning sap",
        submittedByEmployeeId: 7,
        submittedByEmployee: { id: 7, fullName: "Field Collector" },
        center: { centerId: "Ajith", agent: "Chathura Maheepala" }
      }
    }
  ]);
  mockPrisma.transferNote.findMany.mockResolvedValue([]);
});

describe("field collection monitor routes", () => {
  it("requires admin authentication", async () => {
    const response = await request(app).get("/api/field-collection/monitor");

    expect(response.status).toBe(401);
  });

  it("returns mobile-origin monitor data", async () => {
    const response = await authed(request(app).get("/api/field-collection/monitor"));

    expect(response.status).toBe(200);
    expect(response.body.metrics.receivedIssueNotesToday).toBe(1);
    expect(response.body.metrics.lastSyncEmployee).toBe("Field Collector");
    expect(response.body.issueNotes[0].issueNoteName).toBe("Morning sap");
    expect(response.body.issueNoteItems[0]).toEqual(expect.objectContaining({ canCode: "AR001", phValue: 6.2 }));
    expect(mockPrisma.issueNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ mobileLocalId: { not: null } }, { submittedByEmployeeId: { not: null } }]
        })
      })
    );
  });
});

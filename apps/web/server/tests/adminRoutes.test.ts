import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  adminUser: {
    findUnique: vi.fn()
  },
  employee: {
    updateMany: vi.fn(),
    create: vi.fn()
  },
  center: {
    create: vi.fn()
  },
  systemCan: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  issueNote: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  issueNoteItem: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  processingQualityCheck: {
    create: vi.fn(),
    findMany: vi.fn()
  },
  transferNote: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  transferNoteItem: {
    create: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn()
  },
  $transaction: vi.fn((handler) => handler(mockPrisma))
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
});

describe("admin CRUD routes", () => {
  it("creates an employee and keeps passwordHash out of the response", async () => {
    mockPrisma.employee.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.employee.create.mockResolvedValue({
      id: 10,
      userId: "field02",
      fullName: "Field Collector 2",
      role: "Field Collection",
      status: "Active",
      defaultLogin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const response = await authed(
      request(app).post("/api/employees").send({
        userId: "field02",
        fullName: "Field Collector 2",
        password: "password123",
        role: "Field Collection",
        defaultLogin: true
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe("field02");
    expect(response.body.passwordHash).toBeUndefined();
    expect(mockPrisma.employee.updateMany).toHaveBeenCalled();
  });

  it("creates a collection center", async () => {
    mockPrisma.center.create.mockResolvedValue({
      id: 5,
      centerId: "N008",
      location: "Deniyaya",
      agent: "New Agent",
      contactPhone: null,
      status: "Active"
    });

    const response = await authed(
      request(app).post("/api/centers").send({
        centerId: "N008",
        location: "Deniyaya",
        agent: "New Agent"
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.centerId).toBe("N008");
  });

  it("returns can history", async () => {
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 9,
      canCode: "AR009",
      status: "Dispatched",
      histories: [
        {
          id: 1,
          canId: 9,
          status: "Dispatched",
          agentName: "Kamal Kumara",
          reference: "TR-TFN/KK/05/02",
          note: "Dispatched to collection agent",
          createdAt: new Date().toISOString()
        }
      ]
    });

    const response = await authed(request(app).get("/api/system-cans/9/history"));

    expect(response.status).toBe(200);
    expect(response.body.histories).toHaveLength(1);
  });

  it("creates an active field collection issue note", async () => {
    mockPrisma.issueNote.create.mockResolvedValue({
      id: 20,
      issueNoteName: "Morning collection",
      collectionDate: new Date("2026-05-03").toISOString(),
      centerId: 1,
      type: "Field collection",
      status: "Active",
      canCount: 0,
      totalQty: 0,
      center: null
    });

    const response = await authed(
      request(app).post("/api/field-collection/issue-notes").send({
        issueNoteName: "Morning collection",
        collectionDate: "2026-05-03",
        centerId: 1,
        type: "Field collection"
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("Active");
  });

  it("adds an in-warehouse system can to an active issue note", async () => {
    mockPrisma.issueNote.findFirst.mockResolvedValue({
      id: 20,
      issueNoteName: "Morning collection",
      type: "Sap",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 1,
      canCode: "AR001",
      status: "In warehouse"
    });
    mockPrisma.issueNoteItem.create.mockResolvedValue({ id: 91, canCode: "AR001", quantity: 12.5 });
    mockPrisma.issueNoteItem.findMany.mockResolvedValue([
      { id: 91, canCode: "AR001", quantity: 12.5, phValue: 6.2, brixValue: 14.8, temperatureC: 30 }
    ]);
    mockPrisma.issueNote.update.mockResolvedValue({
      id: 20,
      issueNoteName: "Morning collection",
      status: "Active",
      canCount: 1,
      totalQty: 12.5,
      items: [{ id: 91, canCode: "AR001", quantity: 12.5 }]
    });

    const response = await authed(
      request(app).post("/api/field-collection/issue-notes/20/items").send({
        canCode: "ar001",
        quantity: 12.5,
        phValue: 6.2,
        brixValue: 14.8,
        temperatureC: 30
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.canCount).toBe(1);
    expect(response.body.totalQty).toBe(12.5);
    expect(mockPrisma.issueNoteItem.create).toHaveBeenCalledWith({
      data: {
        issueNoteId: 20,
        canCode: "AR001",
        quantity: 12.5,
        phValue: 6.2,
        brixValue: 14.8,
        temperatureC: 30,
        processingStatus: "Pending"
      }
    });
  });

  it("requires temperature for Sap issue note cans", async () => {
    mockPrisma.issueNote.findFirst.mockResolvedValue({
      id: 20,
      issueNoteName: "Morning collection",
      type: "Sap",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 1,
      canCode: "AR001",
      status: "In warehouse"
    });

    const response = await authed(
      request(app).post("/api/field-collection/issue-notes/20/items").send({
        canCode: "AR001",
        quantity: 12.5,
        phValue: 6.2,
        brixValue: 14.8
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Temperature is required for Sap issue notes");
    expect(mockPrisma.issueNoteItem.create).not.toHaveBeenCalled();
  });

  it("allows non-Sap issue note cans without temperature", async () => {
    mockPrisma.issueNote.findFirst.mockResolvedValue({
      id: 20,
      issueNoteName: "Treacle collection",
      type: "Treacle",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 1,
      canCode: "AR002",
      status: "In warehouse"
    });
    mockPrisma.issueNoteItem.create.mockResolvedValue({ id: 92, canCode: "AR002", quantity: 8 });
    mockPrisma.issueNoteItem.findMany.mockResolvedValue([{ id: 92, canCode: "AR002", quantity: 8 }]);
    mockPrisma.issueNote.update.mockResolvedValue({
      id: 20,
      issueNoteName: "Treacle collection",
      type: "Treacle",
      status: "Active",
      canCount: 1,
      totalQty: 8,
      items: [{ id: 92, canCode: "AR002", quantity: 8 }]
    });

    const response = await authed(
      request(app).post("/api/field-collection/issue-notes/20/items").send({
        canCode: "AR002",
        quantity: 8,
        phValue: 0,
        brixValue: 0
      })
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.issueNoteItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canCode: "AR002",
        temperatureC: null
      })
    });
  });

  it("records a Sap processing quality check and warning status", async () => {
    const checkedAt = new Date("2026-05-10T08:00:00.000Z");
    mockPrisma.issueNoteItem.findFirst.mockResolvedValue({
      id: 91,
      issueNoteId: 20,
      canCode: "AR001",
      processingStatus: "Pending",
      issueNote: { id: 20, type: "Sap" }
    });
    mockPrisma.processingQualityCheck.create.mockResolvedValue({
      id: 7,
      issueNoteItemId: 91,
      phValue: 4.8,
      brixValue: 8.5,
      temperatureC: 30,
      decision: "Accepted",
      phWarning: true,
      brixWarning: true,
      temperatureWarning: false,
      warningMessage: "pH outside 5.5-6.5; Brix outside 9.5-12",
      checkedAt
    });
    mockPrisma.issueNoteItem.update.mockResolvedValue({ id: 91, processingStatus: "Accepted" });

    const response = await authed(
      request(app).post("/api/field-collection/issue-note-items/91/quality-checks").send({
        phValue: 4.8,
        brixValue: 8.5,
        temperatureC: 30,
        decision: "Accepted",
        reason: "Accepted manually"
      })
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.processingQualityCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueNoteItemId: 91,
        decision: "Accepted",
        phWarning: true,
        brixWarning: true,
        temperatureWarning: false
      })
    });
    expect(mockPrisma.issueNoteItem.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: { processingStatus: "Accepted" }
    });
  });

  it("rejects processing quality checks for non-Sap issue note cans", async () => {
    mockPrisma.issueNoteItem.findFirst.mockResolvedValue({
      id: 92,
      issueNoteId: 20,
      canCode: "AR002",
      issueNote: { id: 20, type: "Treacle" }
    });

    const response = await authed(
      request(app).post("/api/field-collection/issue-note-items/92/quality-checks").send({
        phValue: 6,
        brixValue: 10,
        temperatureC: 25,
        decision: "Accepted"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Processing quality checks are only available for Sap issue notes");
    expect(mockPrisma.processingQualityCheck.create).not.toHaveBeenCalled();
  });

  it("marks a spoiled Sap can row as returned and updates can history", async () => {
    mockPrisma.issueNoteItem.findFirst.mockResolvedValue({
      id: 91,
      issueNoteId: 20,
      canCode: "AR001",
      processingStatus: "Spoiled",
      issueNote: {
        id: 20,
        issueNoteName: "Morning collection",
        type: "Sap",
        center: { agent: "Test Agent" }
      }
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({ id: 1, canCode: "AR001", status: "Dispatched" });
    mockPrisma.systemCan.update.mockResolvedValue({ id: 1, canCode: "AR001", status: "In warehouse" });
    mockPrisma.issueNoteItem.update.mockResolvedValue({ id: 91, processingStatus: "Returned" });

    const response = await authed(request(app).post("/api/field-collection/issue-note-items/91/return"));

    expect(response.status).toBe(200);
    expect(mockPrisma.systemCan.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: "In warehouse",
        histories: expect.objectContaining({
          create: expect.objectContaining({ note: "Returned after spoiled processing quality check" })
        })
      })
    });
    expect(mockPrisma.issueNoteItem.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: { processingStatus: "Returned" },
      include: expect.any(Object)
    });
  });

  it("exports processing quality checks for research CSV", async () => {
    mockPrisma.processingQualityCheck.findMany.mockResolvedValue([
      {
        id: 7,
        phValue: 4.8,
        brixValue: 8.5,
        temperatureC: 30,
        decision: "Spoiled",
        reason: "Low brix",
        phWarning: true,
        brixWarning: true,
        temperatureWarning: false,
        warningMessage: "pH outside 5.5-6.5; Brix outside 9.5-12",
        checkedAt: new Date("2026-05-10T08:00:00.000Z"),
        issueNoteItem: {
          canCode: "AR001",
          quantity: 12.5,
          phValue: 6.2,
          brixValue: 10.5,
          temperatureC: 28,
          processingStatus: "Spoiled",
          createdAt: new Date("2026-05-10T06:00:00.000Z"),
          issueNote: {
            id: 20,
            issueNoteName: "Morning sap",
            type: "Sap",
            collectionDate: new Date("2026-05-10T00:00:00.000Z"),
            center: { agent: "Test Agent" }
          }
        }
      }
    ]);

    const response = await authed(request(app).get("/api/field-collection/research/spoilage-dataset.csv"));

    expect(response.status).toBe(200);
    expect(response.text).toContain("issueNoteId,issueNoteName");
    expect(response.text).toContain("Morning sap");
    expect(response.text).toContain("2.00");
  });

  it("rejects issue note cans that are not in warehouse", async () => {
    mockPrisma.issueNote.findFirst.mockResolvedValue({
      id: 20,
      issueNoteName: "Morning collection",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 1,
      canCode: "AR019",
      status: "Dispatched"
    });

    const response = await authed(
      request(app).post("/api/field-collection/issue-notes/20/items").send({
        canCode: "AR019",
        quantity: 12.5,
        phValue: 6.2,
        brixValue: 14.8
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only in-warehouse system cans can be added");
    expect(mockPrisma.issueNoteItem.create).not.toHaveBeenCalled();
  });

  it("creates an active transfer note", async () => {
    mockPrisma.transferNote.create.mockResolvedValue({
      id: 31,
      transferNoteNo: "TN-001",
      transferDate: new Date("2026-05-10").toISOString(),
      centerId: 1,
      status: "Active",
      canCount: 0,
      center: null,
      items: []
    });

    const response = await authed(
      request(app).post("/api/field-collection/transfer-notes").send({
        transferNoteNo: "TN-001",
        transferDate: "2026-05-10",
        centerId: 1
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.transferNoteNo).toBe("TN-001");
    expect(mockPrisma.transferNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transferNoteNo: "TN-001",
          status: "Active",
          canCount: 0
        })
      })
    );
  });

  it("adds an uppercase can row to an active transfer note", async () => {
    mockPrisma.transferNote.findFirst.mockResolvedValue({
      id: 31,
      transferNoteNo: "TN-001",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 1,
      canCode: "AR001",
      status: "In warehouse"
    });
    mockPrisma.transferNoteItem.create.mockResolvedValue({ id: 90, canCode: "AR001" });
    mockPrisma.transferNoteItem.count.mockResolvedValue(1);
    mockPrisma.transferNote.update.mockResolvedValue({
      id: 31,
      transferNoteNo: "TN-001",
      status: "Active",
      canCount: 1,
      items: [{ id: 90, canCode: "AR001" }]
    });

    const response = await authed(
      request(app).post("/api/field-collection/transfer-notes/31/items").send({
        canCode: "ar001"
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.canCount).toBe(1);
    expect(mockPrisma.transferNoteItem.create).toHaveBeenCalledWith({
      data: {
        transferNoteId: 31,
        canCode: "AR001"
      }
    });
  });

  it("rejects transfer cans that are not registered system cans", async () => {
    mockPrisma.transferNote.findFirst.mockResolvedValue({
      id: 31,
      transferNoteNo: "TN-001",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue(null);

    const response = await authed(
      request(app).post("/api/field-collection/transfer-notes/31/items").send({
        canCode: "missing-can"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only registered system cans can be added");
    expect(mockPrisma.transferNoteItem.create).not.toHaveBeenCalled();
  });

  it("rejects transfer cans that are not in warehouse", async () => {
    mockPrisma.transferNote.findFirst.mockResolvedValue({
      id: 31,
      transferNoteNo: "TN-001",
      status: "Active"
    });
    mockPrisma.systemCan.findUnique.mockResolvedValue({
      id: 1,
      canCode: "AR019",
      status: "Dispatched"
    });

    const response = await authed(
      request(app).post("/api/field-collection/transfer-notes/31/items").send({
        canCode: "AR019"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only in-warehouse system cans can be added");
    expect(mockPrisma.transferNoteItem.create).not.toHaveBeenCalled();
  });
});

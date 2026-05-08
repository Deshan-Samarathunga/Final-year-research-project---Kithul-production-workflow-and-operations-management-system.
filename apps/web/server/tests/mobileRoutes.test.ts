import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = {
  adminUser: {
    findUnique: vi.fn()
  },
  employee: {
    findUnique: vi.fn()
  },
  center: {
    findMany: vi.fn(),
    findUnique: vi.fn()
  },
  systemCan: {
    findMany: vi.fn()
  },
  issueNote: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn()
  },
  issueNoteItem: {
    findMany: vi.fn(),
    upsert: vi.fn()
  },
  transferNote: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn()
  },
  transferNoteItem: {
    count: vi.fn(),
    upsert: vi.fn()
  },
  $transaction: vi.fn((handler) => handler(mockPrisma))
};

vi.mock("../src/db.js", () => ({
  prisma: mockPrisma
}));

const { createApp } = await import("../src/app.js");

const app = createApp();
const jwtSecret = "replace-this-with-a-long-random-secret";

function mobileToken() {
  return jwt.sign(
    {
      sub: 7,
      userId: "field01",
      displayName: "Field Collector",
      role: "Field Collection",
      kind: "employee"
    },
    jwtSecret
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.employee.findUnique.mockResolvedValue({
    id: 7,
    userId: "field01",
    fullName: "Field Collector",
    role: "Field Collection",
    status: "Active",
    passwordHash: bcrypt.hashSync("password123", 4)
  });
  mockPrisma.center.findMany.mockResolvedValue([]);
  mockPrisma.center.findUnique.mockResolvedValue({ id: 1, centerId: "Ajith" });
  mockPrisma.systemCan.findMany.mockResolvedValue([]);
  mockPrisma.issueNote.findMany.mockResolvedValue([]);
  mockPrisma.issueNote.findUnique.mockResolvedValue({ id: 20, mobileLocalId: "note-local" });
  mockPrisma.issueNote.upsert.mockResolvedValue({ id: 20, mobileLocalId: "note-local" });
  mockPrisma.issueNote.update.mockResolvedValue({ id: 20 });
  mockPrisma.issueNoteItem.findMany.mockResolvedValue([{ quantity: 12.5 }]);
  mockPrisma.issueNoteItem.upsert.mockResolvedValue({ id: 30 });
  mockPrisma.transferNote.findMany.mockResolvedValue([]);
  mockPrisma.transferNote.findUnique.mockResolvedValue({ id: 40, mobileLocalId: "transfer-local" });
  mockPrisma.transferNote.upsert.mockResolvedValue({ id: 40 });
  mockPrisma.transferNote.update.mockResolvedValue({ id: 40 });
  mockPrisma.transferNoteItem.count.mockResolvedValue(1);
  mockPrisma.transferNoteItem.upsert.mockResolvedValue({ id: 50 });
});

describe("mobile sync routes", () => {
  it("logs in an active Field Collection employee", async () => {
    const response = await request(app).post("/api/mobile/auth/login").send({
      userId: "field01",
      password: "password123"
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.role).toBe("Field Collection");
  });

  it("denies non-field-collector employees", async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce({
      id: 8,
      userId: "inventory01",
      fullName: "Inventory",
      role: "Inventory Management",
      status: "Active",
      passwordHash: bcrypt.hashSync("password123", 4)
    });

    const response = await request(app).post("/api/mobile/auth/login").send({
      userId: "inventory01",
      password: "password123"
    });

    expect(response.status).toBe(401);
  });

  it("protects bootstrap with mobile bearer auth", async () => {
    const response = await request(app).get("/api/mobile/bootstrap");

    expect(response.status).toBe(401);
  });

  it("syncs mobile issue notes and items idempotently", async () => {
    const response = await request(app)
      .post("/api/mobile/sync")
      .set("Authorization", `Bearer ${mobileToken()}`)
      .send({
        changes: {
          issueNotes: [
            {
              localId: "note-local",
              issueNoteName: "Morning sap",
              collectionDate: "2026-05-08T09:00:00.000Z",
              centerRemoteId: "1",
              centerCode: "Ajith",
              type: "Sap",
              status: "Completed",
              canCount: 1,
              totalQty: 12.5,
              updatedAt: "2026-05-08T09:15:00.000Z"
            }
          ],
          issueNoteItems: [
            {
              localId: "item-local",
              issueNoteLocalId: "note-local",
              canCode: "AR001",
              quantity: 12.5,
              phValue: 6.2,
              brixValue: 14.8,
              updatedAt: "2026-05-08T09:15:00.000Z"
            }
          ],
          transferNotes: [],
          transferNoteItems: []
        }
      });

    expect(response.status).toBe(200);
    expect(mockPrisma.issueNote.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.issueNoteItem.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.issueNoteItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ phValue: 6.2, brixValue: 14.8 }),
        update: expect.objectContaining({ phValue: 6.2, brixValue: 14.8 })
      })
    );
  });
});

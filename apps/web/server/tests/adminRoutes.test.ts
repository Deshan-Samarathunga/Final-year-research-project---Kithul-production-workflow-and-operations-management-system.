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
    findUnique: vi.fn()
  },
  issueNote: {
    create: vi.fn()
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
});

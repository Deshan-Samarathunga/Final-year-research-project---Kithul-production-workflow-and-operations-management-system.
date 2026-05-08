import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const employees = [
  ["inventory01", "Inventory Management Officer", "Inventory Management"],
  ["order01", "Order management", "Order Management"],
  ["finance01", "Finance Management", "Finance Management"],
  ["label01", "Labeling Expert", "Labeling"],
  ["package01", "Packaging Specialist", "Packaging"],
  ["process01", "Processing Manager", "Processing"],
  ["field01", "Field Collector", "Field Collection"]
] as const;

const centers = [
  ["Ajith", "Thiniyawala", "Chathura Maheepala", null],
  ["C01-NAIWALA", "Naiwala", "N/A", null],
  ["N002", "Warukandeniya", "P A Dammika", null],
  ["N003", "Pannimulla", "Saman Kumara", null],
  ["N004", "Thiniyawala", "Chathura Maheepala", null],
  ["N005", "Maduketa", "M V Tharanga Kumara", null],
  ["N006", "Lankagama", "K S K Nethpriya", null],
  ["N007", "Neluwa", "Kamal Kumara", "0705906909"]
] as const;

const dispatchedCans = new Map([
  ["AR002", ["Saman Kumara", "TRF/SK/04/04", "2026-04-24T19:21:00+05:30"]],
  ["AR009", ["Kamal Kumara", "TR-TFN/KK/05/02", "2026-05-06T11:15:00+05:30"]],
  ["AR019", ["Kamal Kumara", "TR-TFN/KK/05/02", "2026-05-06T11:15:00+05:30"]]
]);

const warehouseDates = [
  "2026-04-30T14:44:00+05:30",
  "2026-04-25T12:02:00+05:30",
  "2026-02-06T13:44:00+05:30",
  "2026-03-20T17:40:00+05:30",
  "2026-04-20T14:08:00+05:30",
  "2026-04-25T19:35:00+05:30"
];

function warehouseDate(index: number) {
  return new Date(warehouseDates[index % warehouseDates.length]);
}

async function main() {
  const adminPassword = await bcrypt.hash("Admin@12345", 12);
  const employeePassword = await bcrypt.hash("password123", 12);

  await prisma.adminUser.upsert({
    where: { userId: "admin" },
    update: {
      email: "admin@kithulflow.local",
      displayName: "Admin User",
      passwordHash: adminPassword
    },
    create: {
      userId: "admin",
      email: "admin@kithulflow.local",
      displayName: "Admin User",
      passwordHash: adminPassword
    }
  });

  for (const [userId, fullName, role] of employees) {
    await prisma.employee.upsert({
      where: { userId },
      update: {
        fullName,
        role,
        status: "Active",
        passwordHash: employeePassword,
        defaultLogin: true
      },
      create: {
        userId,
        fullName,
        role,
        status: "Active",
        passwordHash: employeePassword,
        defaultLogin: true
      }
    });
  }

  for (const [centerId, location, agent, contactPhone] of centers) {
    await prisma.center.upsert({
      where: { centerId },
      update: {
        location,
        agent,
        contactPhone,
        status: "Active"
      },
      create: {
        centerId,
        location,
        agent,
        contactPhone,
        status: "Active"
      }
    });
  }

  for (let i = 1; i <= 629; i += 1) {
    const canCode = `AR${String(i).padStart(3, "0")}`;
    const dispatched = dispatchedCans.get(canCode);
    const lastUpdated = dispatched ? new Date(dispatched[2]) : warehouseDate(i);
    const status = dispatched ? "Dispatched" : "In warehouse";
    const agentName = dispatched?.[0] ?? null;
    const reference = dispatched?.[1] ?? null;

    const can = await prisma.systemCan.upsert({
      where: { canCode },
      update: {
        status,
        agentName,
        reference,
        lastUpdated
      },
      create: {
        canCode,
        status,
        agentName,
        reference,
        lastUpdated
      }
    });

    await prisma.canHistory.upsert({
      where: { id: can.id },
      update: {
        status,
        agentName,
        reference,
        note: status === "Dispatched" ? "Dispatched to collection agent" : "Seeded warehouse stock",
        createdAt: lastUpdated
      },
      create: {
        id: can.id,
        canId: can.id,
        status,
        agentName,
        reference,
        note: status === "Dispatched" ? "Dispatched to collection agent" : "Seeded warehouse stock",
        createdAt: lastUpdated
      }
    });
  }

  const firstCenter = await prisma.center.findFirst({ where: { centerId: "Ajith" } });
  if (firstCenter) {
    for (let i = 1; i <= 118; i += 1) {
      await prisma.issueNote.upsert({
        where: { id: i },
        update: {
          issueNoteName: `Completed collection ${String(i).padStart(3, "0")}`,
          collectionDate: new Date(`2026-04-${String(((i - 1) % 28) + 1).padStart(2, "0")}T09:00:00+05:30`),
          centerId: firstCenter.id,
          type: i % 2 === 0 ? "Field collection" : "Direct collection",
          status: "Completed",
          canCount: 3 + (i % 7),
          totalQty: 75 + i
        },
        create: {
          id: i,
          issueNoteName: `Completed collection ${String(i).padStart(3, "0")}`,
          collectionDate: new Date(`2026-04-${String(((i - 1) % 28) + 1).padStart(2, "0")}T09:00:00+05:30`),
          centerId: firstCenter.id,
          type: i % 2 === 0 ? "Field collection" : "Direct collection",
          status: "Completed",
          canCount: 3 + (i % 7),
          totalQty: 75 + i
        }
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"IssueNote"', 'id'), COALESCE((SELECT MAX("id") FROM "IssueNote"), 1), true)`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"CanHistory"', 'id'), COALESCE((SELECT MAX("id") FROM "CanHistory"), 1), true)`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { hashPassword, isDirectRun, prisma, runSeed } from "./seed-utils.js";

const employees = [
  ["inventory01", "Inventory Management Officer", "Inventory Management"],
  ["order01", "Order management", "Order Management"],
  ["finance01", "Finance Management", "Finance Management"],
  ["label01", "Labeling Expert", "Labeling"],
  ["package01", "Packaging Specialist", "Packaging"],
  ["process01", "Processing Manager", "Processing"],
  ["field01", "Field Collector", "Field Collection"]
] as const;

export async function seedEmployees() {
  const passwordHash = await hashPassword("password123");

  for (const [userId, fullName, role] of employees) {
    await prisma.employee.upsert({
      where: { userId },
      update: {
        fullName,
        role,
        status: "Active",
        passwordHash,
        defaultLogin: true
      },
      create: {
        userId,
        fullName,
        role,
        status: "Active",
        passwordHash,
        defaultLogin: true
      }
    });
  }
}

if (isDirectRun(import.meta.url)) {
  runSeed("Employees", seedEmployees);
}

import { hashPassword, isDirectRun, prisma, runSeed } from "./seed-utils.js";

export async function seedAdmin() {
  const passwordHash = await hashPassword("Admin@12345");

  await prisma.adminUser.upsert({
    where: { userId: "admin" },
    update: {
      email: "admin@kithulflow.local",
      displayName: "Admin User",
      passwordHash
    },
    create: {
      userId: "admin",
      email: "admin@kithulflow.local",
      displayName: "Admin User",
      passwordHash
    }
  });
}

if (isDirectRun(import.meta.url)) {
  runSeed("Admin", seedAdmin);
}

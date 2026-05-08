import { isDirectRun, prisma, runSeed } from "./seed-utils.js";
import { seedAdmin } from "./seed-admin.js";
import { seedEmployees } from "./seed-employees.js";
import { seedCenters } from "./seed-centers.js";
import { seedCans } from "./seed-cans.js";
import { seedIssueNotes } from "./seed-issue-notes.js";

export async function seedAllLocal() {
  await seedAdmin();
  await seedEmployees();
  await seedCenters();
  await seedCans();
  await seedIssueNotes();
}

if (isDirectRun(import.meta.url)) {
  runSeed("Local development data", seedAllLocal);
}

export { prisma };

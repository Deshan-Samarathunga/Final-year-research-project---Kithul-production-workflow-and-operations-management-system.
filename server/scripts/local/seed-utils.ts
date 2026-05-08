import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

export const prisma = new PrismaClient();

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function resetIdSequence(tableName: string) {
  const quotedTable = tableName.replaceAll('"', '""');
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${quotedTable}"', 'id'), COALESCE((SELECT MAX("id") FROM "${quotedTable}"), 1), true)`
  );
}

export function isDirectRun(metaUrl: string) {
  return process.argv[1] ? metaUrl === pathToFileURL(process.argv[1]).href : false;
}

export function runSeed(name: string, seed: () => Promise<void>) {
  seed()
    .then(async () => {
      console.log(`${name} seed complete.`);
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(`${name} seed failed.`);
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

import { isDirectRun, prisma, runSeed } from "./seed-utils.js";

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

export async function seedCenters() {
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
}

if (isDirectRun(import.meta.url)) {
  runSeed("Centers", seedCenters);
}

import { isDirectRun, prisma, resetIdSequence, runSeed } from "./seed-utils.js";

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

export async function seedCans() {
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

  await resetIdSequence("CanHistory");
}

if (isDirectRun(import.meta.url)) {
  runSeed("System cans", seedCans);
}

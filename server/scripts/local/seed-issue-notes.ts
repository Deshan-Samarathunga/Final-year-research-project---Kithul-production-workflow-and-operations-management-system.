import { isDirectRun, prisma, resetIdSequence, runSeed } from "./seed-utils.js";

export async function seedIssueNotes() {
  const firstCenter = await prisma.center.findFirst({ where: { centerId: "Ajith" } });

  if (!firstCenter) {
    throw new Error('Center "Ajith" is required. Run seed:centers before seed:issue-notes.');
  }

  for (let i = 1; i <= 118; i += 1) {
    const collectionDate = new Date(
      `2026-04-${String(((i - 1) % 28) + 1).padStart(2, "0")}T09:00:00+05:30`
    );

    await prisma.issueNote.upsert({
      where: { id: i },
      update: {
        issueNoteName: `Completed collection ${String(i).padStart(3, "0")}`,
        collectionDate,
        centerId: firstCenter.id,
        type: i % 2 === 0 ? "Field collection" : "Direct collection",
        status: "Completed",
        canCount: 3 + (i % 7),
        totalQty: 75 + i
      },
      create: {
        id: i,
        issueNoteName: `Completed collection ${String(i).padStart(3, "0")}`,
        collectionDate,
        centerId: firstCenter.id,
        type: i % 2 === 0 ? "Field collection" : "Direct collection",
        status: "Completed",
        canCount: 3 + (i % 7),
        totalQty: 75 + i
      }
    });
  }

  await resetIdSequence("IssueNote");
}

if (isDirectRun(import.meta.url)) {
  runSeed("Issue notes", seedIssueNotes);
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  const idx = randomInt(0, items.length - 1);
  return items[idx];
}

function makeVisualIdNumber(prefix: string): string {
  const n = randomInt(1, 9999).toString().padStart(4, "0");
  return `${prefix}${n}`;
}

async function main(): Promise<void> {
  const org = await prisma.organization.create({
    data: { id: "00000000-0000-0000-0000-000000000101", name: "Acme Poultry Farm" },
  });

  const owner = await prisma.user.create({
    data: { id: "00000000-0000-0000-0000-000000000001", email: "owner@acme.test", name: "Farm Owner" },
  });

  await prisma.organizationMembership.create({
    data: {
      organizationId: org.id,
      userId: owner.id,
      role: "owner",
      status: "active",
    },
  });

  const coopLocations = await Promise.all(
    ["Layer Coop A", "Breeder Pen 1", "Grow-out Coop"].map((name) =>
      prisma.coopLocation.create({
        data: { organizationId: org.id, name },
      }),
    ),
  );

  const rooster = await prisma.chicken.create({
    data: {
      organizationId: org.id,
      visualIdType: "leg_band",
      visualIdColor: "red",
      visualIdNumber: makeVisualIdNumber("RB-"),
      breedPrimary: "Rhode Island Red",
      breedSecondary: null,
      sex: "rooster",
      hatchDate: new Date("2024-03-15"),
      colorTraits: { feather: "red", comb: "single" },
      status: "alive",
      coopLocationId: coopLocations[1]?.id,
      notes: "Primary sire for V1 sample data.",
    },
  });

  const hen = await prisma.chicken.create({
    data: {
      organizationId: org.id,
      visualIdType: "zip_tie",
      visualIdColor: "blue",
      visualIdNumber: makeVisualIdNumber("HB-"),
      breedPrimary: "Plymouth Rock",
      breedSecondary: null,
      sex: "hen",
      hatchDate: new Date("2024-04-02"),
      colorTraits: { feather: "barred" },
      status: "alive",
      coopLocationId: coopLocations[1]?.id,
      notes: "Primary dam for V1 sample data.",
    },
  });

  const breedingEvent = await prisma.breedingEvent.create({
    data: {
      organizationId: org.id,
      sireId: rooster.id,
      damId: hen.id,
      startDate: new Date("2025-01-10"),
      endDate: new Date("2025-01-18"),
      notes: "First V1 sample breeding event.",
    },
  });

  const offspringCount = 6;
  const offspring = await Promise.all(
    Array.from({ length: offspringCount }).map((_, i) => {
      const sex = pickOne(["hen", "rooster", "unknown"] as const);
      const visualIdType = pickOne(["zip_tie", "leg_band", "metal_band"] as const);
      const visualIdColor = pickOne(["yellow", "green", "white", "black"]);
      const hatchDate = new Date("2025-02-05");
      hatchDate.setDate(hatchDate.getDate() + i);

      return prisma.chicken.create({
        data: {
          organizationId: org.id,
          visualIdType,
          visualIdColor,
          visualIdNumber: makeVisualIdNumber("CH-"),
          breedPrimary: "Mixed",
          breedSecondary: null,
          sex,
          hatchDate,
          sireId: rooster.id,
          damId: hen.id,
          colorTraits: { sample: true },
          status: "alive",
          coopLocationId: coopLocations[2]?.id,
          notes: "Offspring linked via sire_id/dam_id.",
        },
      });
    }),
  );

  // Create grandparents for one offspring (to make lineage + inbreeding checks testable)
  const sireSire = await prisma.chicken.create({
    data: {
      organizationId: org.id,
      visualIdType: "metal_band",
      visualIdColor: "silver",
      visualIdNumber: makeVisualIdNumber("GF-"),
      breedPrimary: "Rhode Island Red",
      breedSecondary: null,
      sex: "rooster",
      hatchDate: new Date("2023-02-01"),
      status: "sold",
      statusDate: new Date("2024-12-01"),
      coopLocationName: "N/A",
      notes: "Grandfather (sire's sire) sample record.",
    },
  });

  const sireDam = await prisma.chicken.create({
    data: {
      organizationId: org.id,
      visualIdType: "metal_band",
      visualIdColor: "gold",
      visualIdNumber: makeVisualIdNumber("GM-"),
      breedPrimary: "Rhode Island Red",
      breedSecondary: null,
      sex: "hen",
      hatchDate: new Date("2023-02-10"),
      status: "deceased",
      statusDate: new Date("2024-08-19"),
      coopLocationName: "N/A",
      notes: "Grandmother (sire's dam) sample record.",
    },
  });

  await prisma.chicken.update({
    where: { id: rooster.id },
    data: { sireId: sireSire.id, damId: sireDam.id },
  });

  const firstOffspring = offspring[0];
  if (firstOffspring)
    await prisma.chicken.update({
      where: { id: firstOffspring.id },
      data: { notes: "Has grandparents via sire lineage." },
    });

  console.log("Seed completed:", {
    organizationId: org.id,
    ownerUserId: owner.id,
    breedingEventId: breedingEvent.id,
    roosterId: rooster.id,
    henId: hen.id,
    offspringIds: offspring.map((c) => c.id),
  });
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



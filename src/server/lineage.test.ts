import { describe, expect, it } from "vitest";
import { getPairInbreedingWarnings } from "./lineage";

interface TestChickenRow {
  id: string;
  organizationId: string;
  deletedAt: null;
  sireId: string | null;
  damId: string | null;
}

function makePrisma(chickens: TestChickenRow[]) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    chicken: {
      async findMany(args: any) {
        calls += 1;
        const orgId = args?.where?.organizationId as string;
        const ids = (args?.where?.id?.in ?? []) as string[];
        return chickens
          .filter((c) => c.organizationId === orgId)
          .filter((c) => c.deletedAt === null)
          .filter((c) => ids.includes(c.id))
          .map((c) => ({ id: c.id, sireId: c.sireId, damId: c.damId }));
      },
    },
  };
}

describe("getPairInbreedingWarnings (V1)", () => {
  it("flags parent_child (hard warning) when one is parent of the other", async () => {
    const org = "org1";
    const sireId = "SIRE";
    const damId = "DAM";
    const prisma = makePrisma([
      { id: sireId, organizationId: org, deletedAt: null, sireId: null, damId: null },
      { id: damId, organizationId: org, deletedAt: null, sireId, damId: null },
    ]);

    const res = await getPairInbreedingWarnings(prisma as any, org, sireId, damId);
    expect(res.meta.found).toBe(true);
    expect(res.warnings.map((w) => w.code)).toContain("parent_child");
    expect(res.meta.queryCount).toBeLessThanOrEqual(2);
  });

  it("flags full_siblings when both parents match", async () => {
    const org = "org1";
    const sireId = "A";
    const damId = "B";
    const pSire = "P1";
    const pDam = "P2";
    const prisma = makePrisma([
      { id: sireId, organizationId: org, deletedAt: null, sireId: pSire, damId: pDam },
      { id: damId, organizationId: org, deletedAt: null, sireId: pSire, damId: pDam },
      { id: pSire, organizationId: org, deletedAt: null, sireId: null, damId: null },
      { id: pDam, organizationId: org, deletedAt: null, sireId: null, damId: null },
    ]);

    const res = await getPairInbreedingWarnings(prisma as any, org, sireId, damId);
    expect(res.warnings.map((w) => w.code)).toContain("full_siblings");
    expect(res.warnings.map((w) => w.code)).not.toContain("half_siblings");
    expect(res.meta.queryCount).toBeLessThanOrEqual(2);
  });

  it("flags half_siblings when exactly one parent matches", async () => {
    const org = "org1";
    const sireId = "A";
    const damId = "B";
    const sharedParent = "P1";
    const prisma = makePrisma([
      { id: sireId, organizationId: org, deletedAt: null, sireId: sharedParent, damId: "P2" },
      { id: damId, organizationId: org, deletedAt: null, sireId: sharedParent, damId: "P3" },
      { id: sharedParent, organizationId: org, deletedAt: null, sireId: null, damId: null },
      { id: "P2", organizationId: org, deletedAt: null, sireId: null, damId: null },
      { id: "P3", organizationId: org, deletedAt: null, sireId: null, damId: null },
    ]);

    const res = await getPairInbreedingWarnings(prisma as any, org, sireId, damId);
    expect(res.warnings.map((w) => w.code)).toContain("half_siblings");
    expect(res.warnings.map((w) => w.code)).not.toContain("full_siblings");
    expect(res.meta.queryCount).toBeLessThanOrEqual(2);
  });

  it("flags shared_grandparent when grandparents overlap without shared parents", async () => {
    const org = "org1";
    const sireId = "A";
    const damId = "B";

    // A parents: P1,P2. B parents: P3,P4 (no shared parents).
    // P1 sire is G1, P3 sire is G1 -> shared grandparent.
    const prisma = makePrisma([
      { id: sireId, organizationId: org, deletedAt: null, sireId: "P1", damId: "P2" },
      { id: damId, organizationId: org, deletedAt: null, sireId: "P3", damId: "P4" },
      { id: "P1", organizationId: org, deletedAt: null, sireId: "G1", damId: null },
      { id: "P2", organizationId: org, deletedAt: null, sireId: null, damId: null },
      { id: "P3", organizationId: org, deletedAt: null, sireId: "G1", damId: null },
      { id: "P4", organizationId: org, deletedAt: null, sireId: null, damId: null },
      { id: "G1", organizationId: org, deletedAt: null, sireId: null, damId: null },
    ]);

    const res = await getPairInbreedingWarnings(prisma as any, org, sireId, damId);
    expect(res.warnings.map((w) => w.code)).toContain("shared_grandparent");
    expect(res.meta.sharedGrandparentIds).toContain("G1");
    expect(res.meta.queryCount).toBeLessThanOrEqual(2);
  });
});



export interface InbreedingWarning {
  code: "parent_child" | "full_siblings" | "half_siblings" | "shared_grandparent";
  message: string;
}

export interface ChickenAncestryRow {
  id: string;
  sireId: string | null;
  damId: string | null;
}

export interface PairRiskResult {
  warnings: InbreedingWarning[];
  meta: {
    found: boolean;
    sharedParentIds: string[];
    sharedGrandparentIds: string[];
    queryCount: number;
  };
}

interface PrismaForLineage {
  chicken: {
    findMany(args: {
      where: { organizationId: string; deletedAt: null; id: { in: string[] } };
      select: Record<string, boolean>;
    }): Promise<Array<Record<string, unknown>>>;
  };
}

function uniqNonNull(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

function coerceAncestryRow(row: Record<string, unknown>): ChickenAncestryRow | null {
  const id = typeof row["id"] === "string" ? (row["id"] as string) : null;
  if (!id) return null;
  return {
    id,
    sireId: typeof row["sireId"] === "string" ? (row["sireId"] as string) : null,
    damId: typeof row["damId"] === "string" ? (row["damId"] as string) : null,
  };
}

export async function getPairInbreedingWarnings(
  prisma: PrismaForLineage,
  organizationId: string,
  sireId: string,
  damId: string,
): Promise<PairRiskResult> {
  let queryCount = 0;

  // Query 1: get parents for both chickens
  queryCount += 1;
  const pairRowsRaw = await prisma.chicken.findMany({
    where: { organizationId, deletedAt: null, id: { in: [sireId, damId] } },
    select: { id: true, sireId: true, damId: true },
  });

  const pairRows = pairRowsRaw
    .map(coerceAncestryRow)
    .filter((x): x is ChickenAncestryRow => Boolean(x));

  const pairMap = new Map(pairRows.map((r) => [r.id, r]));
  const sire = pairMap.get(sireId) ?? null;
  const dam = pairMap.get(damId) ?? null;

  if (!sire || !dam) {
    return {
      warnings: [],
      meta: { found: false, sharedParentIds: [], sharedGrandparentIds: [], queryCount },
    };
  }

  const sireParents = uniqNonNull([sire.sireId, sire.damId]);
  const damParents = uniqNonNull([dam.sireId, dam.damId]);

  const sharedParentsSet = intersect(new Set(sireParents), new Set(damParents));
  const sharedParentIds = Array.from(sharedParentsSet);

  const warnings: InbreedingWarning[] = [];

  // Parent-child: one is parent of the other
  const isParentChild =
    sireId === dam.sireId ||
    sireId === dam.damId ||
    damId === sire.sireId ||
    damId === sire.damId;

  if (isParentChild)
    warnings.push({
      code: "parent_child",
      message:
        sireId === dam.sireId || sireId === dam.damId
          ? "High risk: the selected sire is a parent of the selected dam (parent-child pairing)."
          : "High risk: the selected dam is a parent of the selected sire (parent-child pairing).",
    });

  // Siblings: full vs half
  const hasSameSire = sire.sireId && sire.sireId === dam.sireId;
  const hasSameDam = sire.damId && sire.damId === dam.damId;
  const isFullSiblings = Boolean(hasSameSire && hasSameDam);
  const isHalfSiblings = Boolean(!isFullSiblings && (hasSameSire || hasSameDam));

  if (isFullSiblings)
    warnings.push({
      code: "full_siblings",
      message: "Risk: these birds are full siblings (share both parents).",
    });
  else if (isHalfSiblings)
    warnings.push({
      code: "half_siblings",
      message: "Risk: these birds are half siblings (share one parent).",
    });

  // Query 2: grandparents (fetch parents of parents)
  const parentIdsToFetch = uniqNonNull([sire.sireId, sire.damId, dam.sireId, dam.damId]);
  let sharedGrandparentIds: string[] = [];
  if (parentIdsToFetch.length > 0) {
    queryCount += 1;
    const parentRowsRaw = await prisma.chicken.findMany({
      where: { organizationId, deletedAt: null, id: { in: parentIdsToFetch } },
      select: { id: true, sireId: true, damId: true },
    });

    const parentRows = parentRowsRaw
      .map(coerceAncestryRow)
      .filter((x): x is ChickenAncestryRow => Boolean(x));

    const parentMap = new Map(parentRows.map((r) => [r.id, r]));

    function grandparentsFor(child: ChickenAncestryRow): Set<string> {
      const out = new Set<string>();
      const p1 = child.sireId ? parentMap.get(child.sireId) ?? null : null;
      const p2 = child.damId ? parentMap.get(child.damId) ?? null : null;
      if (p1?.sireId) out.add(p1.sireId);
      if (p1?.damId) out.add(p1.damId);
      if (p2?.sireId) out.add(p2.sireId);
      if (p2?.damId) out.add(p2.damId);
      return out;
    }

    const sireGps = grandparentsFor(sire);
    const damGps = grandparentsFor(dam);
    sharedGrandparentIds = Array.from(intersect(sireGps, damGps));

    if (sharedGrandparentIds.length > 0)
      warnings.push({
        code: "shared_grandparent",
        message: "Risk: these birds share a grandparent (based on known lineage).",
      });
  }

  return {
    warnings,
    meta: {
      found: true,
      sharedParentIds,
      sharedGrandparentIds,
      queryCount,
    },
  };
}



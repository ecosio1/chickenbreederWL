import { Hono } from "hono";
import { z } from "zod";
import type { AuthOrgEnv } from "../middleware/auth-org";
import { jsonError } from "../errors";
import { getPairInbreedingWarnings } from "../lineage";

const CreateBreedingEventSchema = z
  .object({
    sire_id: z.string().uuid(),
    dam_id: z.string().uuid(),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

const UpdateBreedingEventSchema = CreateBreedingEventSchema.partial().strict();

const ListBreedingEventsQuerySchema = z
  .object({
    sire_id: z.string().uuid().optional(),
    dam_id: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.string().optional(),
  })
  .strict();

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function zodErrorDetails(err: z.ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

async function getChickenForPairing(prisma: AuthOrgEnv["Variables"]["prisma"], organizationId: string, id: string) {
  return prisma.chicken.findFirst({ where: { organizationId, id, deletedAt: null } });
}

function isAllowedSireSex(sex: unknown): boolean {
  return sex === "rooster" || sex === "unknown";
}

function isAllowedDamSex(sex: unknown): boolean {
  return sex === "hen" || sex === "unknown";
}

export const breedingEventsRoute = new Hono<AuthOrgEnv>()
  .get("/breeding-events/pair-risk", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const sireId = c.req.query("sire_id");
    const damId = c.req.query("dam_id");
    if (!sireId || !damId)
      return jsonError(c, 400, "validation_error", "Missing sire_id or dam_id.", [
        { path: "sire_id" },
        { path: "dam_id" },
      ]);

    const result = await getPairInbreedingWarnings(prisma as any, organizationId, sireId, damId);
    if (!result.meta.found) return jsonError(c, 404, "not_found", "Chicken not found.");
    return c.json(result);
  })
  .post("/breeding-events/:id/offspring", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const eventId = c.req.param("id");

    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({
        offspring: z
          .array(
            z
              .object({
                visual_id_type: z.enum(["zip_tie", "leg_band", "metal_band", "other"]).optional(),
                visual_id_color: z.string().min(1).optional(),
                visual_id_number: z.string().min(1).optional(),
                hatch_date: z.string().optional(),
                sex: z.enum(["rooster", "hen", "unknown"]).optional(),
                breed_primary: z.string().min(1).optional(),
                breed_secondary: z.string().min(1).nullable().optional(),
                notes: z.string().nullable().optional(),
              })
              .strict(),
          )
          .min(1)
          .max(200),
      })
      .strict()
      .safeParse(body);

    if (!parsed.success)
      return jsonError(c, 400, "validation_error", "Invalid request body.", zodErrorDetails(parsed.error));

    const event = await prisma.breedingEvent.findFirst({
      where: { organizationId, id: eventId },
      include: { sire: true, dam: true },
    });

    if (!event) return jsonError(c, 404, "not_found", "Breeding event not found.");

    const sire = (event as any).sire as Record<string, unknown> | undefined;
    const dam = (event as any).dam as Record<string, unknown> | undefined;
    if (!sire || !dam) return jsonError(c, 400, "validation_error", "Breeding event missing sire/dam.");

    const sireBreedPrimary = typeof sire["breedPrimary"] === "string" ? (sire["breedPrimary"] as string) : "";
    const sireBreedSecondary = typeof sire["breedSecondary"] === "string" ? (sire["breedSecondary"] as string) : null;
    const damBreedPrimary = typeof dam["breedPrimary"] === "string" ? (dam["breedPrimary"] as string) : "";
    const damBreedSecondary = typeof dam["breedSecondary"] === "string" ? (dam["breedSecondary"] as string) : null;

    function defaultBreeds(): { breedPrimary: string; breedSecondary: string | null } {
      const isSamePure =
        sireBreedPrimary &&
        damBreedPrimary &&
        sireBreedPrimary === damBreedPrimary &&
        !sireBreedSecondary &&
        !damBreedSecondary;
      if (isSamePure) return { breedPrimary: sireBreedPrimary, breedSecondary: null };
      return { breedPrimary: sireBreedPrimary || "Mixed", breedSecondary: damBreedPrimary || null };
    }

    function fallbackVisual(i: number) {
      // Visual ID is optional for batch flow, but DB fields are required.
      return {
        visualIdType: "other",
        visualIdColor: "unassigned",
        visualIdNumber: `UNASSIGNED-${(i + 1).toString().padStart(3, "0")}`,
      } as const;
    }

    const created = await Promise.all(
      parsed.data.offspring.map(async (o, i) => {
        const hatchDate = parseDate(o.hatch_date);
        if (o.hatch_date && !hatchDate)
          throw new Error(`invalid_hatch_date:${i}`);

        const defaults = defaultBreeds();
        const visual = {
          visualIdType: o.visual_id_type ?? fallbackVisual(i).visualIdType,
          visualIdColor: o.visual_id_color ?? fallbackVisual(i).visualIdColor,
          visualIdNumber: o.visual_id_number ?? fallbackVisual(i).visualIdNumber,
        };

        return prisma.chicken.create({
          data: {
            organizationId,
            visualIdType: visual.visualIdType,
            visualIdColor: visual.visualIdColor,
            visualIdNumber: visual.visualIdNumber,
            breedPrimary: o.breed_primary ?? defaults.breedPrimary,
            breedSecondary: o.breed_secondary === undefined ? defaults.breedSecondary : o.breed_secondary,
            sex: o.sex ?? "unknown",
            hatchDate,
            sireId: (event as any).sireId,
            damId: (event as any).damId,
            status: "alive",
            statusDate: null,
            notes: o.notes ?? null,
          },
        });
      }),
    ).catch((err) => {
      const msg = String(err?.message ?? "");
      if (msg.startsWith("invalid_hatch_date:")) {
        const idx = Number(msg.split(":")[1] ?? "-1");
        throw jsonError(c, 400, "validation_error", "Invalid hatch_date.", [
          { path: `offspring.${idx}.hatch_date`, message: "Hatch date: must be a valid date." },
        ]);
      }
      throw err;
    });

    return c.json({ created: created.map((x: any) => ({ id: x.id })) }, 201);
  })
  .post("/breeding-events", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const body = await c.req.json().catch(() => null);
    const parsed = CreateBreedingEventSchema.safeParse(body);
    if (!parsed.success)
      return jsonError(c, 400, "validation_error", "Invalid request body.", zodErrorDetails(parsed.error));

    const startDate = parseDate(parsed.data.start_date);
    if (!startDate) return jsonError(c, 400, "validation_error", "Invalid start_date.", [{ path: "start_date" }]);

    const endDate = parseDate(parsed.data.end_date ?? null);
    if (parsed.data.end_date !== undefined && parsed.data.end_date !== null && !endDate)
      return jsonError(c, 400, "validation_error", "Invalid end_date.", [{ path: "end_date" }]);

    const sire = await getChickenForPairing(prisma, organizationId, parsed.data.sire_id);
    if (!sire) return jsonError(c, 400, "validation_error", "Invalid sire_id (not found in organization).", [{ path: "sire_id" }]);
    if (!isAllowedSireSex(sire["sex"]))
      return jsonError(c, 400, "validation_error", "Sire must be rooster or unknown.", [{ path: "sire_id" }]);

    const dam = await getChickenForPairing(prisma, organizationId, parsed.data.dam_id);
    if (!dam) return jsonError(c, 400, "validation_error", "Invalid dam_id (not found in organization).", [{ path: "dam_id" }]);
    if (!isAllowedDamSex(dam["sex"]))
      return jsonError(c, 400, "validation_error", "Dam must be hen or unknown.", [{ path: "dam_id" }]);

    const created = await prisma.breedingEvent.create({
      data: {
        organizationId,
        sireId: parsed.data.sire_id,
        damId: parsed.data.dam_id,
        startDate,
        endDate,
        notes: parsed.data.notes ?? null,
      },
    });

    return c.json({ id: (created as { id: string }).id }, 201);
  })
  .get("/breeding-events", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const queryParsed = ListBreedingEventsQuerySchema.safeParse(c.req.query());
    if (!queryParsed.success)
      return jsonError(c, 400, "validation_error", "Invalid query parameters.", zodErrorDetails(queryParsed.error));

    const where: Record<string, unknown> = { organizationId };
    if (queryParsed.data.sire_id) where.sireId = queryParsed.data.sire_id;
    if (queryParsed.data.dam_id) where.damId = queryParsed.data.dam_id;

    const from = parseDate(queryParsed.data.from);
    if (queryParsed.data.from && !from) return jsonError(c, 400, "validation_error", "Invalid from date.", [{ path: "from" }]);
    const to = parseDate(queryParsed.data.to);
    if (queryParsed.data.to && !to) return jsonError(c, 400, "validation_error", "Invalid to date.", [{ path: "to" }]);

    if (from || to) {
      const fromDate = from ?? new Date("1970-01-01");
      const toDate = to ?? new Date("2999-12-31");
      where.AND = [
        { startDate: { lte: toDate } },
        { OR: [{ endDate: null }, { endDate: { gte: fromDate } }] },
      ];
    }

    const limitRaw = Number(queryParsed.data.limit ?? "0") || 0;
    const take = limitRaw > 0 ? Math.min(100, Math.max(1, limitRaw)) : undefined;

    const items = await prisma.breedingEvent.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: { sire: true, dam: true },
      ...(take ? { take } : {}),
    });

    return c.json({ items });
  })
  .get("/breeding-events/:id", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const id = c.req.param("id");

    const found = await prisma.breedingEvent.findFirst({ where: { organizationId, id }, include: { sire: true, dam: true } });
    if (!found) return jsonError(c, 404, "not_found", "Breeding event not found.");

    return c.json(found);
  })
  .patch("/breeding-events/:id", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const id = c.req.param("id");

    const existing = await prisma.breedingEvent.findFirst({ where: { organizationId, id } });
    if (!existing) return jsonError(c, 404, "not_found", "Breeding event not found.");

    const body = await c.req.json().catch(() => null);
    const parsed = UpdateBreedingEventSchema.safeParse(body);
    if (!parsed.success)
      return jsonError(c, 400, "validation_error", "Invalid request body.", zodErrorDetails(parsed.error));

    const startDate = parsed.data.start_date === undefined ? undefined : parseDate(parsed.data.start_date);
    if (parsed.data.start_date !== undefined && !startDate)
      return jsonError(c, 400, "validation_error", "Invalid start_date.", [{ path: "start_date" }]);

    const endDate =
      parsed.data.end_date === undefined ? undefined : parseDate(parsed.data.end_date ?? null);
    if (parsed.data.end_date !== undefined && parsed.data.end_date !== null && !endDate)
      return jsonError(c, 400, "validation_error", "Invalid end_date.", [{ path: "end_date" }]);

    const sireId = parsed.data.sire_id === undefined ? undefined : parsed.data.sire_id;
    const damId = parsed.data.dam_id === undefined ? undefined : parsed.data.dam_id;

    if (sireId) {
      const sire = await getChickenForPairing(prisma, organizationId, sireId);
      if (!sire) return jsonError(c, 400, "validation_error", "Invalid sire_id (not found in organization).", [{ path: "sire_id" }]);
      if (!isAllowedSireSex(sire["sex"]))
        return jsonError(c, 400, "validation_error", "Sire must be rooster or unknown.", [{ path: "sire_id" }]);
    }
    if (damId) {
      const dam = await getChickenForPairing(prisma, organizationId, damId);
      if (!dam) return jsonError(c, 400, "validation_error", "Invalid dam_id (not found in organization).", [{ path: "dam_id" }]);
      if (!isAllowedDamSex(dam["sex"]))
        return jsonError(c, 400, "validation_error", "Dam must be hen or unknown.", [{ path: "dam_id" }]);
    }

    const updated = await prisma.breedingEvent.update({
      where: { id },
      data: {
        sireId,
        damId,
        startDate,
        endDate,
        notes: parsed.data.notes ?? undefined,
      },
    });

    return c.json(updated);
  });



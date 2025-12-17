import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import type { AuthOrgEnv } from "../middleware/auth-org";
import { jsonError } from "../errors";

const VisualIdTypeSchema = z.enum(["zip_tie", "leg_band", "metal_band", "other"]);
const ChickenSexSchema = z.enum(["rooster", "hen", "unknown"]);
const ChickenStatusSchema = z.enum(["alive", "sold", "deceased"]);

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const CreateChickenSchema = z
  .object({
    visual_id_type: VisualIdTypeSchema,
    visual_id_color: z.string().min(1),
    visual_id_number: z.string().min(1),
    breed_primary: z.string().min(1),
    breed_secondary: z.string().min(1).nullable().optional(),
    sex: ChickenSexSchema,
    hatch_date: z.string().nullable().optional(),
    sire_id: z.string().uuid().nullable().optional(),
    dam_id: z.string().uuid().nullable().optional(),
    color_traits: z.unknown().optional(),
    status: ChickenStatusSchema.optional(),
    status_date: z.string().nullable().optional(),
    coop_location_id: z.string().uuid().nullable().optional(),
    coop_location_name: z.string().min(1).nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

const UpdateChickenSchema = CreateChickenSchema.partial().strict();

const ListChickensQuerySchema = z
  .object({
    page: z.string().optional(),
    page_size: z.string().optional(),
    status: ChickenStatusSchema.optional(),
    sex: ChickenSexSchema.optional(),
    breed_primary: z.string().optional(),
    coop_location_id: z.string().uuid().optional(),
    coop_location_name: z.string().optional(),
    search: z.string().optional(),
    visual_id_number_exact: z.string().optional(),
    exclude_id: z.string().uuid().optional(),
    sire_id: z.string().uuid().optional(),
    dam_id: z.string().uuid().optional(),
    parent_id: z.string().uuid().optional(),
  })
  .strict();

function zodErrorDetails(err: z.ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

async function assertParentInOrg(prisma: AuthOrgEnv["Variables"]["prisma"], organizationId: string, id: string) {
  const parent = await prisma.chicken.findFirst({ where: { organizationId, id, deletedAt: null } });
  if (!parent) throw new Error("parent_not_found");
}

export const chickensRoute = new Hono<AuthOrgEnv>()
  .post("/chickens", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const body = await c.req.json().catch(() => null);
    const parsed = CreateChickenSchema.safeParse(body);
    if (!parsed.success)
      return jsonError(c, 400, "validation_error", "Invalid request body.", zodErrorDetails(parsed.error));

    const hatchDate = parseDate(parsed.data.hatch_date ?? null);
    if (parsed.data.hatch_date !== undefined && parsed.data.hatch_date !== null && !hatchDate)
      return jsonError(c, 400, "validation_error", "Invalid hatch_date.", [
        { path: "hatch_date", message: "Hatch date: must be a valid date." },
      ]);

    const providedStatus = parsed.data.status ?? "alive";
    const statusDate = parseDate(parsed.data.status_date ?? null);
    if (parsed.data.status_date !== undefined && parsed.data.status_date !== null && !statusDate)
      return jsonError(c, 400, "validation_error", "Invalid status_date.", [
        { path: "status_date", message: "Status date: must be a valid date." },
      ]);

    const sireId = parsed.data.sire_id ?? null;
    const damId = parsed.data.dam_id ?? null;
    if (sireId) {
      try {
        await assertParentInOrg(prisma, organizationId, sireId);
      } catch {
        return jsonError(c, 400, "validation_error", "Invalid sire_id (not found in organization).", [
          { path: "sire_id" },
        ]);
      }
    }
    if (damId) {
      try {
        await assertParentInOrg(prisma, organizationId, damId);
      } catch {
        return jsonError(c, 400, "validation_error", "Invalid dam_id (not found in organization).", [
          { path: "dam_id" },
        ]);
      }
    }

    const created = await prisma.chicken.create({
      data: {
        organizationId,
        visualIdType: parsed.data.visual_id_type,
        visualIdColor: parsed.data.visual_id_color,
        visualIdNumber: parsed.data.visual_id_number,
        breedPrimary: parsed.data.breed_primary,
        breedSecondary: parsed.data.breed_secondary ?? null,
        sex: parsed.data.sex,
        hatchDate,
        sireId,
        damId,
        colorTraits: parsed.data.color_traits ?? undefined,
        status: providedStatus,
        statusDate:
          providedStatus === "sold" || providedStatus === "deceased" ? statusDate ?? todayDate() : statusDate ?? null,
        coopLocationId: parsed.data.coop_location_id ?? null,
        coopLocationName: parsed.data.coop_location_name ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    return c.json({ id: (created as { id: string }).id }, 201);
  })
  .put("/chickens/:id", async (c) => {
    // Treat PUT as PATCH in V1 (partial updates) but keep route compatibility.
    return handleUpdate(c);
  })
  .get("/chickens", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const queryParsed = ListChickensQuerySchema.safeParse(c.req.query());
    if (!queryParsed.success)
      return jsonError(c, 400, "validation_error", "Invalid query parameters.", zodErrorDetails(queryParsed.error));

    const page = Math.max(1, Number(queryParsed.data.page ?? "1") || 1);
    const pageSizeRaw = Number(queryParsed.data.page_size ?? "25") || 25;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      organizationId,
      deletedAt: null,
    };

    if (queryParsed.data.status) where.status = queryParsed.data.status;
    if (queryParsed.data.sex) where.sex = queryParsed.data.sex;
    if (queryParsed.data.breed_primary) where.breedPrimary = queryParsed.data.breed_primary;
    if (queryParsed.data.coop_location_id) where.coopLocationId = queryParsed.data.coop_location_id;
    if (queryParsed.data.coop_location_name)
      where.coopLocationName = { contains: queryParsed.data.coop_location_name, mode: "insensitive" };

    const hasParentId = Boolean(queryParsed.data.parent_id);
    const hasSearch = Boolean(queryParsed.data.search && queryParsed.data.search.trim().length > 0);
    if (hasParentId && hasSearch)
      return jsonError(
        c,
        400,
        "validation_error",
        "Do not combine parent_id with search in V1.",
        [{ path: "parent_id" }, { path: "search" }],
      );
    if (queryParsed.data.sire_id) where.sireId = queryParsed.data.sire_id;
    if (queryParsed.data.dam_id) where.damId = queryParsed.data.dam_id;
    if (hasParentId && !hasSearch)
      where.OR = [{ sireId: queryParsed.data.parent_id }, { damId: queryParsed.data.parent_id }];

    if (queryParsed.data.exclude_id) where.NOT = { id: queryParsed.data.exclude_id };

    if (queryParsed.data.visual_id_number_exact) where.visualIdNumber = queryParsed.data.visual_id_number_exact;
    else if (queryParsed.data.search) {
      const search = queryParsed.data.search.trim();
      if (search.length > 0)
        where.OR = [
          { uniqueCode: { contains: search, mode: "insensitive" } },
          { visualIdNumber: { contains: search, mode: "insensitive" } },
        ];
    }

    const [total, items] = await Promise.all([
      prisma.chicken.count({ where }),
      prisma.chicken.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return c.json({
      page,
      page_size: pageSize,
      total,
      items,
    });
  })
  .get("/chickens/:id", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const id = c.req.param("id");

    async function fetchChicken(chickenId: string) {
      return prisma.chicken.findFirst({ where: { organizationId, id: chickenId, deletedAt: null } });
    }

    const found = await fetchChicken(id);
    if (!found) return jsonError(c, 404, "not_found", "Chicken not found.");

    const sire = found.sireId ? await fetchChicken(String(found.sireId)) : null;
    const dam = found.damId ? await fetchChicken(String(found.damId)) : null;

    const sireSire = sire?.sireId ? await fetchChicken(String(sire.sireId)) : null;
    const sireDam = sire?.damId ? await fetchChicken(String(sire.damId)) : null;
    const damSire = dam?.sireId ? await fetchChicken(String(dam.sireId)) : null;
    const damDam = dam?.damId ? await fetchChicken(String(dam.damId)) : null;

    const out: any = { ...found };
    out.sire = sire ? { ...sire, sire: sireSire, dam: sireDam } : null;
    out.dam = dam ? { ...dam, sire: damSire, dam: damDam } : null;

    return c.json(out);
  })
  .patch("/chickens/:id", async (c) => {
    return handleUpdate(c);
  })
  .delete("/chickens/:id", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");
    const id = c.req.param("id");

    const existing = await prisma.chicken.findFirst({ where: { organizationId, id, deletedAt: null } });
    if (!existing) return jsonError(c, 404, "not_found", "Chicken not found.");

    const updated = await prisma.chicken.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return c.json({ id: (updated as { id: string }).id, deleted: true });
  });

async function handleUpdate(c: Context<AuthOrgEnv>) {
  const organizationId = c.get("organizationId");
  const prisma = c.get("prisma");
  const id = c.req.param("id");

  const existing = await prisma.chicken.findFirst({ where: { organizationId, id, deletedAt: null } });
  if (!existing) return jsonError(c, 404, "not_found", "Chicken not found.");

  const body = await c.req.json().catch(() => null);
  const parsed = UpdateChickenSchema.safeParse(body);
  if (!parsed.success)
    return jsonError(c, 400, "validation_error", "Invalid request body.", zodErrorDetails(parsed.error));

  const hatchDate = parsed.data.hatch_date === undefined ? undefined : parseDate(parsed.data.hatch_date ?? null);
  if (parsed.data.hatch_date !== undefined && parsed.data.hatch_date !== null && !hatchDate)
    return jsonError(c, 400, "validation_error", "Invalid hatch_date.", [
      { path: "hatch_date", message: "Hatch date: must be a valid date." },
    ]);

  const statusDate = parsed.data.status_date === undefined ? undefined : parseDate(parsed.data.status_date ?? null);
  if (parsed.data.status_date !== undefined && parsed.data.status_date !== null && !statusDate)
    return jsonError(c, 400, "validation_error", "Invalid status_date.", [
      { path: "status_date", message: "Status date: must be a valid date." },
    ]);

  const sireId = parsed.data.sire_id === undefined ? undefined : parsed.data.sire_id ?? null;
  const damId = parsed.data.dam_id === undefined ? undefined : parsed.data.dam_id ?? null;

  if (sireId) {
    try {
      await assertParentInOrg(prisma, organizationId, sireId);
    } catch {
      return jsonError(c, 400, "validation_error", "Invalid sire_id (not found in organization).", [{ path: "sire_id" }]);
    }
  }
  if (damId) {
    try {
      await assertParentInOrg(prisma, organizationId, damId);
    } catch {
      return jsonError(c, 400, "validation_error", "Invalid dam_id (not found in organization).", [{ path: "dam_id" }]);
    }
  }

  const nextStatus = parsed.data.status;
  const shouldAutofillStatusDate = nextStatus === "sold" || nextStatus === "deceased";

  const updated = await prisma.chicken.update({
    where: { id },
    data: {
      visualIdType: parsed.data.visual_id_type,
      visualIdColor: parsed.data.visual_id_color,
      visualIdNumber: parsed.data.visual_id_number,
      breedPrimary: parsed.data.breed_primary,
      breedSecondary: parsed.data.breed_secondary ?? undefined,
      sex: parsed.data.sex,
      hatchDate,
      sireId,
      damId,
      colorTraits: parsed.data.color_traits,
      status: parsed.data.status,
      statusDate:
        parsed.data.status !== undefined
          ? shouldAutofillStatusDate
            ? statusDate ?? todayDate()
            : statusDate ?? null
          : statusDate,
      coopLocationId: parsed.data.coop_location_id ?? undefined,
      coopLocationName: parsed.data.coop_location_name ?? undefined,
      notes: parsed.data.notes ?? undefined,
    },
  });

  return c.json(updated);
}



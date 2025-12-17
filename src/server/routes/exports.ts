import { Hono } from "hono";
import type { AuthOrgEnv } from "../middleware/auth-org";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  lines.push("");
  return lines.join("\n");
}

function formatDateOnly(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  // Prisma may return ISO strings in our environment; Excel prefers date-only
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export const exportsRoute = new Hono<AuthOrgEnv>()
  .get("/export/chickens.csv", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const chickens = await prisma.chicken.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { sire: { select: { uniqueCode: true } }, dam: { select: { uniqueCode: true } } },
    });

    const headers = [
      "id",
      "unique_code",
      "visual_id_type",
      "visual_id_color",
      "visual_id_number",
      "breed_primary",
      "breed_secondary",
      "sex",
      "hatch_date",
      "status",
      "status_date",
      "coop_location_name",
      "notes",
      "color_traits",
      "sire_unique_code",
      "dam_unique_code",
      "created_at",
      "updated_at",
    ];

    const rows = chickens.map((ch: any) => ({
      id: ch.id,
      unique_code: ch.uniqueCode,
      visual_id_type: ch.visualIdType,
      visual_id_color: ch.visualIdColor,
      visual_id_number: ch.visualIdNumber,
      breed_primary: ch.breedPrimary,
      breed_secondary: ch.breedSecondary ?? "",
      sex: ch.sex,
      hatch_date: formatDateOnly(ch.hatchDate),
      status: ch.status,
      status_date: formatDateOnly(ch.statusDate),
      coop_location_name: ch.coopLocationName ?? "",
      notes: ch.notes ?? "",
      color_traits: ch.colorTraits ? JSON.stringify(ch.colorTraits) : "",
      sire_unique_code: ch.sire?.uniqueCode ?? "",
      dam_unique_code: ch.dam?.uniqueCode ?? "",
      created_at: ch.createdAt ? String(ch.createdAt) : "",
      updated_at: ch.updatedAt ? String(ch.updatedAt) : "",
    }));

    const csv = toCsv(headers, rows);
    c.header("content-type", "text/csv; charset=utf-8");
    c.header("content-disposition", 'attachment; filename="chickens.csv"');
    return c.body(csv);
  })
  .get("/export/breeding-events.csv", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const events = await prisma.breedingEvent.findMany({
      where: { organizationId },
      orderBy: { startDate: "asc" },
      include: { sire: { select: { uniqueCode: true } }, dam: { select: { uniqueCode: true } } },
    });

    const headers = [
      "id",
      "start_date",
      "end_date",
      "notes",
      "sire_id",
      "sire_unique_code",
      "dam_id",
      "dam_unique_code",
      "created_at",
      "updated_at",
    ];

    const rows = events.map((ev: any) => ({
      id: ev.id,
      start_date: formatDateOnly(ev.startDate),
      end_date: formatDateOnly(ev.endDate),
      notes: ev.notes ?? "",
      sire_id: ev.sireId,
      sire_unique_code: ev.sire?.uniqueCode ?? "",
      dam_id: ev.damId,
      dam_unique_code: ev.dam?.uniqueCode ?? "",
      created_at: ev.createdAt ? String(ev.createdAt) : "",
      updated_at: ev.updatedAt ? String(ev.updatedAt) : "",
    }));

    const csv = toCsv(headers, rows);
    c.header("content-type", "text/csv; charset=utf-8");
    c.header("content-disposition", 'attachment; filename="breeding-events.csv"');
    return c.body(csv);
  });



import { Hono } from "hono";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { z } from "zod";
import type { AuthOrgEnv } from "../middleware/auth-org";
import { jsonError } from "../errors";

const SexSchema = z.enum(["rooster", "hen", "unknown"]);
const StatusSchema = z.enum(["alive", "sold", "deceased"]);
const VisualIdTypeSchema = z.enum(["zip_tie", "leg_band", "metal_band", "other"]);

const MappingSchema = z
  .object({
    unique_code: z.string().nullable().optional(),
    visual_id_type: z.string().nullable().optional(),
    visual_id_color: z.string().nullable().optional(),
    visual_id_number: z.string().nullable().optional(),
    breed_primary: z.string().nullable().optional(),
    breed_secondary: z.string().nullable().optional(),
    sex: z.string().nullable().optional(),
    hatch_date: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    status_date: z.string().nullable().optional(),
    coop_location_name: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    sire_unique_code: z.string().nullable().optional(),
    dam_unique_code: z.string().nullable().optional(),
    color_traits: z.string().nullable().optional(),
  })
  .strict();

type Mapping = z.infer<typeof MappingSchema>;

interface ImportRowResult {
  row: number; // 1-based (data rows, excluding header)
  action: "created" | "updated" | "failed";
  id?: string;
  reason?: string;
}

function trimOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeSex(value: string | null): "rooster" | "hen" | "unknown" | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "rooster" || v === "male") return "rooster";
  if (v === "hen" || v === "female") return "hen";
  if (v === "unknown" || v === "u" || v === "?") return "unknown";
  return null;
}

function normalizeStatus(value: string | null): "alive" | "sold" | "deceased" | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "alive") return "alive";
  if (v === "sold") return "sold";
  if (v === "deceased" || v === "dead") return "deceased";
  return null;
}

function normalizeVisualIdType(value: string | null): "zip_tie" | "leg_band" | "metal_band" | "other" | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "zip_tie" || v === "zip tie") return "zip_tie";
  if (v === "leg_band" || v === "leg band" || v === "band") return "leg_band";
  if (v === "metal_band" || v === "metal band") return "metal_band";
  if (v === "other") return "other";
  return null;
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function readCell(record: Record<string, unknown>, mappingKey: keyof Mapping, mapping: Mapping): string | null {
  const col = mapping[mappingKey];
  if (!col) return null;
  return trimOrNull(record[col]);
}

function loadRecords(fileName: string, bytes: Uint8Array): Array<Record<string, unknown>> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(bytes, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Array<Record<string, unknown>>;
    return rows;
  }

  const text = new TextDecoder().decode(bytes);
  const records = parseCsv(text, { columns: true, skip_empty_lines: true, trim: true }) as Array<Record<string, unknown>>;
  return records;
}

export const importChickensRoute = new Hono<AuthOrgEnv>()
  .get("/import/chickens/template.csv", (c) => {
    const headers = [
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
      "sire_unique_code",
      "dam_unique_code",
      "color_traits",
    ];

    const example = [
      "",
      "leg_band",
      "red",
      "0142",
      "Plymouth Rock",
      "",
      "hen",
      "2025-02-05",
      "alive",
      "",
      "Breeder Pen 1",
      "Imported from Excel",
      "SIRE12345",
      "DAM54321",
      "{\"feather\":\"barred\"}",
    ];

    const csv = `${headers.join(",")}\n${example.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")}\n`;

    c.header("content-type", "text/csv; charset=utf-8");
    c.header("content-disposition", 'attachment; filename="chickens-template.csv"');
    return c.body(csv);
  })
  .post("/import/chickens", async (c) => {
    const organizationId = c.get("organizationId");
    const prisma = c.get("prisma");

    const form = await c.req.raw.formData().catch(() => null);
    if (!form) return jsonError(c, 400, "validation_error", "Expected multipart form data.");

    const file = form.get("file");
    const mappingRaw = form.get("mapping");
    if (!(file instanceof File)) return jsonError(c, 400, "validation_error", "Missing file.", [{ path: "file" }]);
    if (typeof mappingRaw !== "string")
      return jsonError(c, 400, "validation_error", "Missing mapping.", [{ path: "mapping" }]);

    const mappingJson = (() => {
      try {
        return JSON.parse(mappingRaw);
      } catch {
        return null;
      }
    })();

    const mappingParsed = MappingSchema.safeParse(mappingJson);
    if (!mappingParsed.success)
      return jsonError(c, 400, "validation_error", "Invalid mapping.", mappingParsed.error.issues);
    const mapping = mappingParsed.data;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const records = loadRecords(file.name, bytes);
    if (records.length === 0) return jsonError(c, 400, "validation_error", "No rows found in file.");
    if (records.length > 5000)
      return jsonError(c, 400, "validation_error", "File too large for V1 (max 5000 rows).");

    // Precompute unique_codes present in file (for parent linking)
    const importCodes = new Set<string>();
    for (const rec of records) {
      const code = readCell(rec, "unique_code", mapping);
      if (code) importCodes.add(code);
    }

    const referencedParentCodes = new Set<string>();
    for (const rec of records) {
      const sireCode = readCell(rec, "sire_unique_code", mapping);
      const damCode = readCell(rec, "dam_unique_code", mapping);
      if (sireCode) referencedParentCodes.add(sireCode);
      if (damCode) referencedParentCodes.add(damCode);
    }

    const allCodesToResolve = Array.from(new Set([...importCodes, ...referencedParentCodes]));
    const existing = allCodesToResolve.length
      ? await prisma.chicken.findMany({
          where: { organizationId, deletedAt: null, uniqueCode: { in: allCodesToResolve } },
        })
      : [];

    const existingByCode = new Map<string, any>();
    for (const c0 of existing) if (typeof c0.uniqueCode === "string") existingByCode.set(c0.uniqueCode, c0);

    const results: ImportRowResult[] = [];
    const createdByRowIdx = new Map<number, any>();
    const createdByCode = new Map<string, any>();

    // Pass 1: create/update chickens without parent links
    for (let i = 0; i < records.length; i += 1) {
      const rowNumber = i + 1;
      const rec = records[i] ?? {};

      try {
        const uniqueCode = readCell(rec, "unique_code", mapping);

        const visualTypeRaw = readCell(rec, "visual_id_type", mapping);
        const visualIdType = normalizeVisualIdType(visualTypeRaw);
        if (!visualIdType) throw new Error("Missing/invalid visual_id_type.");

        const visualIdColor = readCell(rec, "visual_id_color", mapping);
        if (!visualIdColor) throw new Error("Missing visual_id_color.");

        const visualIdNumber = readCell(rec, "visual_id_number", mapping);
        if (!visualIdNumber) throw new Error("Missing visual_id_number.");

        const breedPrimary = readCell(rec, "breed_primary", mapping);
        if (!breedPrimary) throw new Error("Missing breed_primary.");

        const breedSecondary = readCell(rec, "breed_secondary", mapping);

        const sexRaw = readCell(rec, "sex", mapping);
        const sex = normalizeSex(sexRaw) ?? "unknown";
        if (!SexSchema.safeParse(sex).success) throw new Error("Invalid sex.");

        const hatchDate = parseDateOnly(readCell(rec, "hatch_date", mapping));
        if (readCell(rec, "hatch_date", mapping) && !hatchDate) throw new Error("Invalid hatch_date.");

        const statusRaw = readCell(rec, "status", mapping);
        const status = normalizeStatus(statusRaw) ?? "alive";
        if (!StatusSchema.safeParse(status).success) throw new Error("Invalid status.");

        const statusDate = parseDateOnly(readCell(rec, "status_date", mapping));
        if (readCell(rec, "status_date", mapping) && !statusDate) throw new Error("Invalid status_date.");

        const coopLocationName = readCell(rec, "coop_location_name", mapping);
        const notes = readCell(rec, "notes", mapping);

        const colorTraitsRaw = readCell(rec, "color_traits", mapping);
        const colorTraits =
          colorTraitsRaw && colorTraitsRaw.trim().startsWith("{")
            ? (() => {
                try {
                  return JSON.parse(colorTraitsRaw);
                } catch {
                  return colorTraitsRaw;
                }
              })()
            : colorTraitsRaw ?? undefined;

        const existingChicken = uniqueCode ? existingByCode.get(uniqueCode) ?? null : null;

        if (existingChicken) {
          const updated = await prisma.chicken.update({
            where: { id: existingChicken.id },
            data: {
              visualIdType,
              visualIdColor,
              visualIdNumber,
              breedPrimary,
              breedSecondary: breedSecondary ?? null,
              sex,
              hatchDate,
              colorTraits: colorTraits ?? undefined,
              status,
              statusDate: status === "sold" || status === "deceased" ? statusDate ?? todayDate() : statusDate ?? null,
              coopLocationName: coopLocationName ?? null,
              notes: notes ?? null,
            },
          });

          results.push({ row: rowNumber, action: "updated", id: String((updated as any).id) });
          createdByRowIdx.set(i, updated);
          if (uniqueCode) createdByCode.set(uniqueCode, updated);
          continue;
        }

        const created = await prisma.chicken.create({
          data: {
            organizationId,
            uniqueCode: uniqueCode ?? undefined,
            visualIdType,
            visualIdColor,
            visualIdNumber,
            breedPrimary,
            breedSecondary: breedSecondary ?? null,
            sex,
            hatchDate,
            colorTraits: colorTraits ?? undefined,
            status,
            statusDate: status === "sold" || status === "deceased" ? statusDate ?? todayDate() : statusDate ?? null,
            coopLocationName: coopLocationName ?? null,
            notes: notes ?? null,
          },
        });

        results.push({ row: rowNumber, action: "created", id: String((created as any).id) });
        createdByRowIdx.set(i, created);
        if (uniqueCode) createdByCode.set(uniqueCode, created);
      } catch (err) {
        results.push({ row: rowNumber, action: "failed", reason: String((err as any)?.message ?? err) });
      }
    }

    // Pass 2: link parents by unique_code when possible
    const allCreatedCodes = new Set([...existingByCode.keys(), ...createdByCode.keys()]);
    for (let i = 0; i < records.length; i += 1) {
      const rec = records[i] ?? {};
      const created = createdByRowIdx.get(i) ?? null;
      if (!created) continue;

      const sireCode = readCell(rec, "sire_unique_code", mapping);
      const damCode = readCell(rec, "dam_unique_code", mapping);
      if (!sireCode && !damCode) continue;

      // If user provided parent codes that can't be resolved (either existing or also-imported), record failure.
      if (sireCode && !allCreatedCodes.has(sireCode)) {
        results.push({ row: i + 1, action: "failed", reason: `sire_unique_code not found: ${sireCode}` });
        continue;
      }
      if (damCode && !allCreatedCodes.has(damCode)) {
        results.push({ row: i + 1, action: "failed", reason: `dam_unique_code not found: ${damCode}` });
        continue;
      }

      const sire = sireCode ? createdByCode.get(sireCode) ?? existingByCode.get(sireCode) ?? null : null;
      const dam = damCode ? createdByCode.get(damCode) ?? existingByCode.get(damCode) ?? null : null;

      // Parent rows might have failed creation; in that case, report clear error and skip linking.
      if (sireCode && !sire) {
        results.push({ row: i + 1, action: "failed", reason: `sire_unique_code could not be linked: ${sireCode}` });
        continue;
      }
      if (damCode && !dam) {
        results.push({ row: i + 1, action: "failed", reason: `dam_unique_code could not be linked: ${damCode}` });
        continue;
      }

      await prisma.chicken.update({
        where: { id: created.id },
        data: {
          sireId: sire ? sire.id : null,
          damId: dam ? dam.id : null,
        },
      });
    }

    const createdCount = results.filter((r) => r.action === "created").length;
    const updatedCount = results.filter((r) => r.action === "updated").length;
    const failed = results.filter((r) => r.action === "failed");

    return c.json({
      rows_total: records.length,
      rows_created: createdCount,
      rows_updated: updatedCount,
      rows_failed: failed.length,
      failures: failed.slice(0, 200),
    });
  });



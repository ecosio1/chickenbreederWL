"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { formatVisualId } from "../chickens/visual-id-format";
import type { RememberedChickenDefaults } from "../chickens/remembered-defaults";
import { loadRememberedChickenDefaults, saveRememberedChickenDefaults } from "../chickens/remembered-defaults";

const RowSchema = z.object({
  visual_id_type: z.enum(["zip_tie", "leg_band", "metal_band", "other"]).optional(),
  visual_id_color: z.string().min(1).optional(),
  visual_id_number: z.string().min(1).optional(),
  hatch_date: z.string().optional(),
  sex: z.enum(["rooster", "hen", "unknown"]).optional(),
  breed_primary: z.string().min(1).optional(),
  breed_secondary: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const PayloadSchema = z.object({
  offspring: z.array(RowSchema).min(1).max(200),
});

interface RowFieldErrors {
  [key: string]: string | undefined;
}

function formatRowIssue(issue: z.ZodIssue): string {
  const msg = typeof issue.message === "string" && issue.message.trim().length ? issue.message.trim() : "Invalid value.";
  if (issue.code === "too_small" && issue.type === "string") return "required.";
  if (issue.code === "invalid_enum_value") return "invalid selection.";
  return msg.endsWith(".") ? msg : `${msg}.`;
}

export function OffspringBatchForm({
  breedingEventId,
  breedingEvent,
}: {
  breedingEventId: string;
  breedingEvent: Record<string, unknown>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, RowFieldErrors>>({});
  const [remembered, setRemembered] = useState<RememberedChickenDefaults>({});

  const sire = (breedingEvent["sire"] as Record<string, any> | undefined) ?? {};
  const dam = (breedingEvent["dam"] as Record<string, any> | undefined) ?? {};

  const defaultBreed = useMemo(() => {
    const sirePrimary = typeof sire["breedPrimary"] === "string" ? (sire["breedPrimary"] as string) : "";
    const sireSecondary = typeof sire["breedSecondary"] === "string" ? (sire["breedSecondary"] as string) : null;
    const damPrimary = typeof dam["breedPrimary"] === "string" ? (dam["breedPrimary"] as string) : "";
    const damSecondary = typeof dam["breedSecondary"] === "string" ? (dam["breedSecondary"] as string) : null;

    const isSamePure =
      sirePrimary && damPrimary && sirePrimary === damPrimary && !sireSecondary && !damSecondary;
    if (isSamePure) return { breed_primary: sirePrimary, breed_secondary: null as string | null };
    return { breed_primary: sirePrimary || "Mixed", breed_secondary: damPrimary || null };
  }, [dam, sire]);

  const [count, setCount] = useState(6);
  const [rows, setRows] = useState<Array<z.infer<typeof RowSchema>>>(() =>
    Array.from({ length: 6 }).map(() => ({
      sex: "unknown",
      breed_primary: defaultBreed.breed_primary,
      breed_secondary: defaultBreed.breed_secondary,
    })),
  );

  useEffect(() => {
    const loaded = loadRememberedChickenDefaults();
    setRemembered((prev) => ({ ...prev, ...loaded }));
  }, []);

  useEffect(() => {
    if (!remembered.visualIdType && !remembered.visualIdColor && !remembered.breedPrimary && remembered.breedSecondary === undefined)
      return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        visual_id_type: r.visual_id_type ?? remembered.visualIdType,
        visual_id_color: r.visual_id_color ?? remembered.visualIdColor,
        // keep parent-derived defaults; only backfill if empty
        breed_primary: r.breed_primary ?? remembered.breedPrimary,
        breed_secondary: r.breed_secondary ?? remembered.breedSecondary,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remembered.visualIdColor, remembered.visualIdType]);

  function resize(nextCount: number) {
    const n = Math.max(1, Math.min(200, nextCount));
    setCount(n);
    setRows((prev) => {
      if (prev.length === n) return prev;
      if (prev.length > n) return prev.slice(0, n);
      return [
        ...prev,
        ...Array.from({ length: n - prev.length }).map(() => ({
          sex: "unknown" as const,
          breed_primary: defaultBreed.breed_primary,
          breed_secondary: defaultBreed.breed_secondary,
          visual_id_type: remembered.visualIdType,
          visual_id_color: remembered.visualIdColor,
        })),
      ];
    });
  }

  function setRow(idx: number, patch: Partial<z.infer<typeof RowSchema>>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setRowErrors((prev) => {
      const existing = prev[idx];
      if (!existing) return prev;
      const nextForRow: RowFieldErrors = { ...existing };
      for (const key of Object.keys(patch)) nextForRow[key] = undefined;
      return { ...prev, [idx]: nextForRow };
    });
  }

  async function onSubmit() {
    setServerError(null);
    setRowErrors({});
    const parsed = PayloadSchema.safeParse({ offspring: rows });
    if (!parsed.success) {
      const next: Record<number, RowFieldErrors> = {};
      for (const issue of parsed.error.issues) {
        const rowIndex = typeof issue.path[1] === "number" ? issue.path[1] : null;
        const field = typeof issue.path[2] === "string" ? issue.path[2] : null;
        if (rowIndex === null || field === null) continue;
        next[rowIndex] = { ...(next[rowIndex] ?? {}), [field]: `Row ${rowIndex + 1} ${field.replaceAll("_", " ")}: ${formatRowIssue(issue)}` };
      }
      setRowErrors(next);
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/breeding-events/${breedingEventId}/offspring`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body?.error?.message ?? "Failed to create offspring.");
        return;
      }

      const existing = loadRememberedChickenDefaults();
      const source = rows.find((r) => r.visual_id_type || r.visual_id_color || r.breed_primary || r.breed_secondary !== undefined) ?? {};
      saveRememberedChickenDefaults({
        visualIdType: source.visual_id_type ?? existing.visualIdType,
        visualIdColor: source.visual_id_color ?? existing.visualIdColor,
        breedPrimary: source.breed_primary ?? existing.breedPrimary,
        breedSecondary: source.breed_secondary ?? existing.breedSecondary,
      });

      router.push(`/breeding-events/${breedingEventId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="text-base font-semibold">Parents</div>
        <div className="mt-2 space-y-2">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-black/60">Sire</span>
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-black">
                {formatVisualId({
                  visualIdType: sire["visualIdType"] ?? null,
                  visualIdColor: sire["visualIdColor"] ?? null,
                  visualIdNumber: sire["visualIdNumber"] ?? null,
                })}
              </div>
              {String(sire["uniqueCode"] ?? "") ? (
                <div className="text-xs text-black/60">{String(sire["uniqueCode"] ?? "")}</div>
              ) : null}
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-black/60">Dam</span>
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-black">
                {formatVisualId({
                  visualIdType: dam["visualIdType"] ?? null,
                  visualIdColor: dam["visualIdColor"] ?? null,
                  visualIdNumber: dam["visualIdNumber"] ?? null,
                })}
              </div>
              {String(dam["uniqueCode"] ?? "") ? (
                <div className="text-xs text-black/60">{String(dam["uniqueCode"] ?? "")}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <Label>How many offspring?</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => resize(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="text-sm text-black/60">
            Minimal required fields: none. Defaults: sex=unknown, breed per parents.
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-4 py-3 text-sm font-medium">Batch rows</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.02] text-black/70">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Visual ID (optional)</th>
                <th className="px-4 py-2">Hatch date</th>
                <th className="px-4 py-2">Sex</th>
                <th className="px-4 py-2">Breed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-black/10 align-top">
                  <td className="px-4 py-2 text-black/60">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <Select
                        value={r.visual_id_type ?? ""}
                        onChange={(e) => setRow(idx, { visual_id_type: e.target.value as any })}
                      >
                        <option value="">(type)</option>
                        <option value="zip_tie">zip_tie</option>
                        <option value="leg_band">leg_band</option>
                        <option value="metal_band">metal_band</option>
                        <option value="other">other</option>
                      </Select>
                      <Input
                        placeholder="color"
                        value={r.visual_id_color ?? ""}
                        onChange={(e) => setRow(idx, { visual_id_color: e.target.value || undefined })}
                      />
                      <Input
                        placeholder="number"
                        value={r.visual_id_number ?? ""}
                        onChange={(e) => setRow(idx, { visual_id_number: e.target.value || undefined })}
                      />
                    </div>
                    {rowErrors[idx]?.visual_id_type ? (
                      <p className="mt-1 text-xs text-red-700">{rowErrors[idx]?.visual_id_type}</p>
                    ) : null}
                    {rowErrors[idx]?.visual_id_color ? (
                      <p className="mt-1 text-xs text-red-700">{rowErrors[idx]?.visual_id_color}</p>
                    ) : null}
                    {rowErrors[idx]?.visual_id_number ? (
                      <p className="mt-1 text-xs text-red-700">{rowErrors[idx]?.visual_id_number}</p>
                    ) : null}
                    <div className="mt-1 text-xs text-black/50">
                      Preview:{" "}
                      {formatVisualId({
                        visualIdType: r.visual_id_type ?? null,
                        visualIdColor: r.visual_id_color ?? null,
                        visualIdNumber: r.visual_id_number ?? null,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="date"
                      value={r.hatch_date ?? ""}
                      onChange={(e) => setRow(idx, { hatch_date: e.target.value || undefined })}
                    />
                    {rowErrors[idx]?.hatch_date ? <p className="mt-1 text-xs text-red-700">{rowErrors[idx]?.hatch_date}</p> : null}
                  </td>
                  <td className="px-4 py-2">
                    <Select value={r.sex ?? "unknown"} onChange={(e) => setRow(idx, { sex: e.target.value as any })}>
                      <option value="unknown">unknown</option>
                      <option value="hen">hen</option>
                      <option value="rooster">rooster</option>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <Input
                        value={r.breed_primary ?? defaultBreed.breed_primary}
                        onChange={(e) => setRow(idx, { breed_primary: e.target.value || undefined })}
                        placeholder="breed primary"
                      />
                      <Input
                        value={r.breed_secondary ?? ""}
                        onChange={(e) =>
                          setRow(idx, { breed_secondary: e.target.value ? e.target.value : null })
                        }
                        placeholder="breed secondary (optional)"
                      />
                    </div>
                    {rowErrors[idx]?.breed_primary ? (
                      <p className="mt-1 text-xs text-red-700">{rowErrors[idx]?.breed_primary}</p>
                    ) : null}
                    {rowErrors[idx]?.breed_secondary ? (
                      <p className="mt-1 text-xs text-red-700">{rowErrors[idx]?.breed_secondary}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {serverError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{serverError}</div>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={isPending} type="button" onClick={onSubmit}>
          Create {rows.length} offspring
        </Button>
      </div>
    </div>
  );
}



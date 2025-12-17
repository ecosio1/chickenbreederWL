"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { ChickenPicker } from "./chicken-picker";
import { formatVisualId } from "./visual-id-format";
import { badgeClassForWarning, dotClassForWarning } from "../../ui/semantic-colors";
import { loadRememberedChickenDefaults, saveRememberedChickenDefaults } from "./remembered-defaults";

const FormSchema = z.object({
  visual_id_type: z.enum(["zip_tie", "leg_band", "metal_band", "other"]),
  visual_id_color: z.string().min(1),
  visual_id_number: z.string().min(1),
  breed_primary: z.string().min(1),
  breed_secondary: z.string().nullable(),
  sex: z.enum(["rooster", "hen", "unknown"]),
  hatch_date: z.string().nullable(),
  sire_id: z.string().uuid().nullable(),
  dam_id: z.string().uuid().nullable(),
  color_traits: z.string().nullable(),
  status: z.enum(["alive", "sold", "deceased"]),
  status_date: z.string().nullable(),
  coop_location_name: z.string().nullable(),
  notes: z.string().nullable(),
});

export interface ChickenFormProps {
  mode: "create" | "edit";
  chickenId?: string;
  initialValue?: Record<string, unknown>;
}

interface ChickenFormState {
  visual_id_type: "zip_tie" | "leg_band" | "metal_band" | "other";
  visual_id_color: string;
  visual_id_number: string;
  breed_primary: string;
  breed_secondary: string | null;
  sex: "rooster" | "hen" | "unknown";
  hatch_date: string | null;
  sire_id: string | null;
  dam_id: string | null;
  color_traits: string | null;
  status: "alive" | "sold" | "deceased";
  status_date: string | null;
  coop_location_name: string | null;
  notes: string | null;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

const FIELD_LABEL: Record<string, string> = {
  visual_id_type: "Visual ID type",
  visual_id_color: "Visual ID color",
  visual_id_number: "Visual ID number",
  breed_primary: "Breed (primary)",
  breed_secondary: "Breed (secondary)",
  sex: "Sex",
  hatch_date: "Hatch date",
  sire_id: "Sire",
  dam_id: "Dam",
  color_traits: "Color traits",
  status: "Status",
  status_date: "Status date",
  coop_location_name: "Coop / Location",
  notes: "Notes",
};

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatZodIssue(field: string, issue: z.ZodIssue): string {
  const label = FIELD_LABEL[field] ?? field;
  if (issue.code === "invalid_type" && (issue as any).received === "undefined") return `${label}: required.`;
  if (issue.code === "too_small" && issue.type === "string") return `${label}: required.`;
  if (issue.code === "invalid_string" && (issue as any).validation === "uuid") return `${label}: must be a valid id.`;
  if (issue.code === "invalid_enum_value") return `${label}: invalid selection.`;
  const msg = typeof issue.message === "string" && issue.message.trim().length ? issue.message.trim() : "Invalid value.";
  return `${label}: ${msg.endsWith(".") ? msg : `${msg}.`}`;
}

function formatServerFieldError(field: string, message: unknown): string {
  const label = FIELD_LABEL[field] ?? field;
  const msg = typeof message === "string" && message.trim().length ? message.trim() : "Invalid value.";
  if (msg.toLowerCase().startsWith(label.toLowerCase())) return msg;
  return `${label}: ${msg.endsWith(".") ? msg : `${msg}.`}`;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getNullableString(v: unknown): string | null {
  const s = getString(v);
  return s.length ? s : null;
}

function normalizeDateInput(v: unknown): string | null {
  const s = getString(v);
  if (!s) return null;
  // accept ISO or date-only; store as date-only in inputs
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function ChickenForm({ mode, chickenId, initialValue }: ChickenFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const visualIdNumberRef = useRef<HTMLInputElement | null>(null);
  const hasAppliedRememberedDefaults = useRef(false);
  const hasInitialPrefill = Boolean(initialValue && Object.keys(initialValue).length > 0);

  const initial: ChickenFormState = useMemo(() => {
    const v = initialValue ?? {};
    return {
      visual_id_type: (getString(v["visualIdType"]) as "zip_tie" | "leg_band" | "metal_band" | "other") || "zip_tie",
      visual_id_color: getString(v["visualIdColor"]) || "",
      visual_id_number: getString(v["visualIdNumber"]) || "",
      breed_primary: getString(v["breedPrimary"]) || "",
      breed_secondary: getNullableString(v["breedSecondary"]),
      sex: (getString(v["sex"]) as "rooster" | "hen" | "unknown") || "unknown",
      hatch_date: normalizeDateInput(v["hatchDate"]),
      sire_id: getNullableString(v["sireId"]),
      dam_id: getNullableString(v["damId"]),
      color_traits: v["colorTraits"] ? JSON.stringify(v["colorTraits"]) : null,
      status: (getString(v["status"]) as "alive" | "sold" | "deceased") || "alive",
      status_date: normalizeDateInput(v["statusDate"]),
      coop_location_name: getNullableString(v["coopLocationName"]),
      notes: getNullableString(v["notes"]),
    };
  }, [initialValue]);

  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (mode !== "create") return;
    if (hasInitialPrefill) return;
    if (hasAppliedRememberedDefaults.current) return;
    hasAppliedRememberedDefaults.current = true;

    const remembered = loadRememberedChickenDefaults();
    setForm((prev) => ({
      ...prev,
      visual_id_type: remembered.visualIdType ?? prev.visual_id_type,
      visual_id_color: prev.visual_id_color ? prev.visual_id_color : (remembered.visualIdColor ?? prev.visual_id_color),
      breed_primary: prev.breed_primary ? prev.breed_primary : (remembered.breedPrimary ?? prev.breed_primary),
      breed_secondary:
        prev.breed_secondary !== null && prev.breed_secondary.trim().length > 0
          ? prev.breed_secondary
          : (remembered.breedSecondary ?? prev.breed_secondary),
    }));
  }, [hasInitialPrefill, mode]);

  useEffect(() => {
    let isCancelled = false;
    const number = form.visual_id_number.trim();
    if (!number) {
      setDuplicateWarning(null);
      return;
    }

    const t = setTimeout(() => {
      void (async () => {
        const exclude = mode === "edit" && chickenId ? `&exclude_id=${encodeURIComponent(chickenId)}` : "";
        const res = await fetch(
          `/api/chickens?visual_id_number_exact=${encodeURIComponent(number)}&page_size=1${exclude}`,
        );
        const body = await res.json().catch(() => null);
        if (isCancelled) return;
        const total = typeof body?.total === "number" ? body.total : 0;
        setDuplicateWarning(
          total > 0
            ? "Warning: another chicken in this organization already uses this Visual ID number. Save is allowed, but it may cause confusion."
            : null,
        );
      })();
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(t);
    };
  }, [chickenId, form.visual_id_number, mode]);

  function setField<K extends keyof ChickenFormState>(key: K, value: ChickenFormState[K]) {
    setForm((prev) => {
      const next: ChickenFormState = { ...prev, [key]: value } as ChickenFormState;
      if (key === "status") {
        const status = value as ChickenFormState["status"];
        if ((status === "sold" || status === "deceased") && !next.status_date) next.status_date = todayDateOnly();
      }
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function applyServerValidation(details: unknown) {
    if (!Array.isArray(details)) return;
    const next: FieldErrors = {};
    for (const item of details) {
      const path = typeof item?.path === "string" ? item.path : "";
      if (!path) continue;
      next[path] = formatServerFieldError(path, item?.message);
    }
    setFieldErrors(next);
  }

  async function onSubmit(intent: "save" | "save_add_another") {
    setServerError(null);
    setFieldErrors({});

    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (!field) continue;
        next[field] = formatZodIssue(field, issue);
      }
      setFieldErrors(next);
      return;
    }

    startTransition(async () => {
      const isEdit = mode === "edit";
      const url = isEdit ? `/api/chickens/${chickenId}` : "/api/chickens";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body?.error?.message ?? "Failed to save.");
        applyServerValidation(body?.error?.details);
        return;
      }

      saveRememberedChickenDefaults({
        visualIdType: parsed.data.visual_id_type,
        visualIdColor: parsed.data.visual_id_color,
        breedPrimary: parsed.data.breed_primary,
        breedSecondary: parsed.data.breed_secondary,
      });

      if (mode === "create" && intent === "save_add_another") {
        const remembered = loadRememberedChickenDefaults();
        setForm({
          visual_id_type: remembered.visualIdType ?? "zip_tie",
          visual_id_color: remembered.visualIdColor ?? "",
          visual_id_number: "",
          breed_primary: remembered.breedPrimary ?? "",
          breed_secondary: remembered.breedSecondary ?? null,
          sex: "unknown",
          hatch_date: null,
          sire_id: null,
          dam_id: null,
          color_traits: null,
          status: "alive",
          status_date: null,
          coop_location_name: null,
          notes: null,
        });
        setDuplicateWarning(null);
        setServerError(null);
        setFieldErrors({});
        router.refresh();
        // focus first high-velocity field for quick entry
        setTimeout(() => visualIdNumberRef.current?.focus(), 0);
        return;
      }

      router.push("/chickens");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-black/[0.02] px-4 py-2">
        <div className="text-xs text-black/60">Visual ID</div>
        <div className="text-sm font-medium">
          {formatVisualId({
            visualIdType: form.visual_id_type,
            visualIdColor: form.visual_id_color,
            visualIdNumber: form.visual_id_number,
          })}
        </div>
      </div>

      {duplicateWarning ? (
        <div className={["mb-4", badgeClassForWarning("risk")].join(" ")}>
          <div className="flex items-start gap-2">
            <span className={dotClassForWarning("risk")} aria-hidden="true" />
            <div className="space-y-2">
              <div className="font-medium">Risk warning</div>
              <div>{duplicateWarning}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Visual ID type</Label>
          <Select value={form.visual_id_type} onChange={(e) => setField("visual_id_type", e.target.value as any)}>
            <option value="zip_tie">zip_tie</option>
            <option value="leg_band">leg_band</option>
            <option value="metal_band">metal_band</option>
            <option value="other">other</option>
          </Select>
          {fieldErrors.visual_id_type ? <p className="text-xs text-red-700">{fieldErrors.visual_id_type}</p> : null}
        </div>

        <div className="space-y-1">
          <Label>Visual ID color</Label>
          <Input
            value={form.visual_id_color}
            onChange={(e) => setField("visual_id_color", e.target.value)}
            placeholder="e.g., red"
          />
          {fieldErrors.visual_id_color ? <p className="text-xs text-red-700">{fieldErrors.visual_id_color}</p> : null}
        </div>

        <div className="space-y-1">
          <Label>Visual ID number</Label>
          <Input
            ref={visualIdNumberRef}
            value={form.visual_id_number}
            onChange={(e) => setField("visual_id_number", e.target.value)}
            placeholder="e.g., 0142"
          />
          {fieldErrors.visual_id_number ? <p className="text-xs text-red-700">{fieldErrors.visual_id_number}</p> : null}
        </div>

        <div className="space-y-1">
          <Label>Breed (primary)</Label>
          <Input
            value={form.breed_primary}
            onChange={(e) => setField("breed_primary", e.target.value)}
            placeholder="e.g., Plymouth Rock"
          />
          {fieldErrors.breed_primary ? <p className="text-xs text-red-700">{fieldErrors.breed_primary}</p> : null}
        </div>

        <div className="space-y-1">
          <Label>Breed (secondary)</Label>
          <Input
            value={form.breed_secondary ?? ""}
            onChange={(e) => setField("breed_secondary", e.target.value ? e.target.value : null)}
            placeholder="Optional (mixed breed)"
          />
        </div>

        <div className="space-y-1">
          <Label>Sex</Label>
          <Select value={form.sex} onChange={(e) => setField("sex", e.target.value as any)}>
            <option value="unknown">unknown</option>
            <option value="hen">hen</option>
            <option value="rooster">rooster</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setField("status", e.target.value as any)}>
            <option value="alive">alive</option>
            <option value="sold">sold</option>
            <option value="deceased">deceased</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status date</Label>
          <Input
            type="date"
            value={form.status_date ?? ""}
            onChange={(e) => setField("status_date", e.target.value ? e.target.value : null)}
          />
          <p className="text-xs text-black/50">Auto-filled when status becomes sold/deceased.</p>
        </div>

        <div className="space-y-1">
          <Label>Hatch date</Label>
          <Input
            type="date"
            value={form.hatch_date ?? ""}
            onChange={(e) => setField("hatch_date", e.target.value ? e.target.value : null)}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Coop / Location</Label>
          <Input
            value={form.coop_location_name ?? ""}
            onChange={(e) => setField("coop_location_name", e.target.value ? e.target.value : null)}
            placeholder="e.g., Breeder Pen 1"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Parents (optional)</Label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChickenPicker
              label="Sire"
              value={form.sire_id}
              onPick={(id) => setField("sire_id", id)}
              onClear={() => setField("sire_id", null)}
            />
            <ChickenPicker
              label="Dam"
              value={form.dam_id}
              onPick={(id) => setField("dam_id", id)}
              onClear={() => setField("dam_id", null)}
            />
          </div>
          {fieldErrors.sire_id ? <p className="text-xs text-red-700">{fieldErrors.sire_id}</p> : null}
          {fieldErrors.dam_id ? <p className="text-xs text-red-700">{fieldErrors.dam_id}</p> : null}
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Color traits (JSON or text)</Label>
          <Input
            value={form.color_traits ?? ""}
            onChange={(e) => setField("color_traits", e.target.value ? e.target.value : null)}
            placeholder='e.g., {"feather":"barred"}'
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Notes</Label>
          <Input
            value={form.notes ?? ""}
            onChange={(e) => setField("notes", e.target.value ? e.target.value : null)}
            placeholder="Optional"
          />
        </div>
      </div>

      {serverError ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{serverError}</div>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        {mode === "create" ? (
          <Button disabled={isPending} type="button" variant="secondary" onClick={() => onSubmit("save_add_another")}>
            Save & Add Another
          </Button>
        ) : null}
        <Button disabled={isPending} type="button" onClick={() => onSubmit("save")}>
          Save
        </Button>
      </div>
    </div>
  );
}



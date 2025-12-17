"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ChickenPicker } from "../chickens/chicken-picker";
import { warningTone } from "../../ui/semantic-colors";
import { WarningBanner } from "../../ui/warning-banner";

const FormSchema = z.object({
  sire_id: z.string().uuid(),
  dam_id: z.string().uuid(),
  start_date: z.string().min(1),
  end_date: z.string().nullable(),
  notes: z.string().nullable(),
});

interface RiskWarning {
  code: string;
  message: string;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

const FIELD_LABEL: Record<string, string> = {
  sire_id: "Sire",
  dam_id: "Dam",
  start_date: "Start date",
  end_date: "End date",
  notes: "Notes",
};

function formatZodIssue(field: string, issue: z.ZodIssue): string {
  const label = FIELD_LABEL[field] ?? field;
  if (issue.code === "invalid_type" && (issue as any).received === "undefined") return `${label}: required.`;
  if (issue.code === "invalid_string" && (issue as any).validation === "uuid") return `${label}: must be selected.`;
  if (issue.code === "too_small" && issue.type === "string") return `${label}: required.`;
  const msg = typeof issue.message === "string" && issue.message.trim().length ? issue.message.trim() : "Invalid value.";
  return `${label}: ${msg.endsWith(".") ? msg : `${msg}.`}`;
}

export function BreedingEventForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [riskWarnings, setRiskWarnings] = useState<RiskWarning[]>([]);
  const [isCheckingRisk, setIsCheckingRisk] = useState(false);

  const [form, setForm] = useState({
    sire_id: null as string | null,
    dam_id: null as string | null,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null as string | null,
    notes: null as string | null,
  });

  useEffect(() => {
    let isCancelled = false;
    const sireId = form.sire_id;
    const damId = form.dam_id;
    if (!sireId || !damId) {
      setRiskWarnings([]);
      return;
    }

    const t = setTimeout(() => {
      void (async () => {
        setIsCheckingRisk(true);
        const res = await fetch(
          `/api/breeding-events/pair-risk?sire_id=${encodeURIComponent(sireId!)}&dam_id=${encodeURIComponent(damId!)}`,
        );
        const body = await res.json().catch(() => null);
        if (isCancelled) return;
        setIsCheckingRisk(false);
        setRiskWarnings(Array.isArray(body?.warnings) ? body.warnings : []);
      })();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(t);
    };
  }, [form.dam_id, form.sire_id]);

  async function onSubmit() {
    setServerError(null);
    setFieldErrors({});
    const parsed = FormSchema.safeParse({
      sire_id: form.sire_id,
      dam_id: form.dam_id,
      start_date: form.start_date,
      end_date: form.end_date,
      notes: form.notes,
    });

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
      const res = await fetch("/api/breeding-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body?.error?.message ?? "Failed to create breeding event.");
        return;
      }
      router.push("/breeding-events");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <ChickenPicker
            label="Sire (rooster/unknown)"
            value={form.sire_id}
            onPick={(id) => {
              setForm((p) => ({ ...p, sire_id: id }));
              setFieldErrors((p) => ({ ...p, sire_id: undefined }));
            }}
            onClear={() => {
              setForm((p) => ({ ...p, sire_id: null }));
              setFieldErrors((p) => ({ ...p, sire_id: undefined }));
            }}
            allowedSexes={["rooster", "unknown"]}
          />
          {fieldErrors.sire_id ? <p className="text-xs text-red-700">{fieldErrors.sire_id}</p> : null}
        </div>
        <div className="space-y-1">
          <ChickenPicker
            label="Dam (hen/unknown)"
            value={form.dam_id}
            onPick={(id) => {
              setForm((p) => ({ ...p, dam_id: id }));
              setFieldErrors((p) => ({ ...p, dam_id: undefined }));
            }}
            onClear={() => {
              setForm((p) => ({ ...p, dam_id: null }));
              setFieldErrors((p) => ({ ...p, dam_id: undefined }));
            }}
            allowedSexes={["hen", "unknown"]}
          />
          {fieldErrors.dam_id ? <p className="text-xs text-red-700">{fieldErrors.dam_id}</p> : null}
        </div>

        <div className="space-y-1">
          <Label>Start date</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => {
              setForm((p) => ({ ...p, start_date: e.target.value }));
              setFieldErrors((p) => ({ ...p, start_date: undefined }));
            }}
          />
          {fieldErrors.start_date ? <p className="text-xs text-red-700">{fieldErrors.start_date}</p> : null}
        </div>

        <div className="space-y-1">
          <Label>End date</Label>
          <Input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value ? e.target.value : null }))}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Notes</Label>
          <Input
            value={form.notes ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value ? e.target.value : null }))}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="mt-4 rounded-md border border-black/10 bg-black/[0.02] p-4">
        <div className="text-sm font-medium">Inbreeding warnings</div>
        {isCheckingRisk ? <div className="mt-2 text-sm text-black/60">Checking…</div> : null}
        {!isCheckingRisk && form.sire_id && form.dam_id && riskWarnings.length === 0 ? (
          <div className="mt-2 text-sm text-black/60">No warnings detected (based on known parents/grandparents).</div>
        ) : null}
        {riskWarnings.length > 0 ? (
          <div className="mt-4 space-y-2">
            {riskWarnings.map((w) => {
              const tone = warningTone(w.code);
              return (
                <WarningBanner
                  key={w.code}
                  tone={tone}
                  title={tone === "critical" ? "Critical warning" : tone === "risk" ? "Risk warning" : "Info"}
                  message={w.message}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {serverError ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{serverError}</div>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button disabled={isPending} type="button" onClick={onSubmit}>
          Create breeding event
        </Button>
      </div>
    </div>
  );
}



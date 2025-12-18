"use client";

import * as React from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { formatVisualId } from "../chickens/visual-id";

type Row = Record<string, unknown>;

type MappingKey =
  | "unique_code"
  | "visual_id_type"
  | "visual_id_color"
  | "visual_id_number"
  | "breed_primary"
  | "breed_secondary"
  | "sex"
  | "hatch_date"
  | "status"
  | "status_date"
  | "coop_location_name"
  | "notes"
  | "sire_unique_code"
  | "dam_unique_code"
  | "color_traits";

const DEFAULT_KEYS: Array<{ key: MappingKey; label: string; required?: boolean }> = [
  { key: "unique_code", label: "Unique code (optional)" },
  { key: "visual_id_type", label: "Visual ID type", required: true },
  { key: "visual_id_color", label: "Visual ID color", required: true },
  { key: "visual_id_number", label: "Visual ID number", required: true },
  { key: "breed_primary", label: "Breed (primary)", required: true },
  { key: "breed_secondary", label: "Breed (secondary)" },
  { key: "sex", label: "Sex" },
  { key: "hatch_date", label: "Hatch date" },
  { key: "status", label: "Status" },
  { key: "status_date", label: "Status date" },
  { key: "coop_location_name", label: "Coop / Location" },
  { key: "notes", label: "Notes" },
  { key: "sire_unique_code", label: "Sire unique code (optional parent link)" },
  { key: "dam_unique_code", label: "Dam unique code (optional parent link)" },
  { key: "color_traits", label: "Color traits (JSON/text)" },
];

function toStringSafe(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function readCell(row: Row, col: string | null | undefined): string {
  if (!col) return "";
  return toStringSafe(row[col]).trim();
}

function parseFile(file: File): Promise<{ columns: string[]; rows: Row[] }> {
  return new Promise((resolve, reject) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const bytes = new Uint8Array(reader.result as ArrayBuffer);
          const wb = XLSX.read(bytes, { type: "array" });
          const sheetName = wb.SheetNames[0];
          const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
          if (!sheet) return resolve({ columns: [], rows: [] });
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Row[];
          const columns = rows.length ? Object.keys(rows[0] ?? {}) : [];
          resolve({ columns, rows });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
      return;
    }

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const columns = rows.length ? Object.keys(rows[0] ?? {}) : (res.meta.fields ?? []);
        resolve({ columns, rows });
      },
      error: (err) => reject(err),
    });
  });
}

interface ImportResult {
  rows_total: number;
  rows_created: number;
  rows_updated: number;
  rows_failed: number;
  failures: Array<{ row: number; reason: string }>;
}

export function ImportChickens() {
  const [file, setFile] = React.useState<File | null>(null);
  const [columns, setColumns] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const [mapping, setMapping] = React.useState<Record<MappingKey, string | null>>(() => {
    const m: any = {};
    for (const k of DEFAULT_KEYS) m[k.key] = null;
    return m;
  });

  async function onPickFile(f: File | null) {
    setResult(null);
    setError(null);
    setFile(f);
    if (!f) {
      setColumns([]);
      setRows([]);
      return;
    }

    try {
      const parsed = await parseFile(f);
      setColumns(parsed.columns);
      setRows(parsed.rows);

      // best-effort auto-map by matching header names
      const lowerToActual = new Map(parsed.columns.map((c) => [c.toLowerCase().trim(), c] as const));
      setMapping((prev) => {
        const next = { ...prev };
        for (const k of DEFAULT_KEYS) {
          const match = lowerToActual.get(k.key);
          if (match) next[k.key] = match;
        }
        return next;
      });
    } catch (e) {
      setError("Failed to read file. Please upload a CSV or Excel file.");
      setColumns([]);
      setRows([]);
    }
  }

  const requiredMissing = DEFAULT_KEYS.filter((k) => k.required).filter((k) => !mapping[k.key]);

  async function runImport() {
    if (!file) return;
    if (requiredMissing.length) {
      setError(`Please map required fields: ${requiredMissing.map((x) => x.label).join(", ")}`);
      return;
    }

    setIsImporting(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.set("file", file);
    form.set("mapping", JSON.stringify(mapping));

    const res = await fetch("/api/import/chickens", { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as any;
    setIsImporting(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Import failed.");
      return;
    }

    setResult(body as ImportResult);
  }

  const preview = rows.slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="space-y-2">
          <Label htmlFor="file">Upload CSV/XLSX</Label>
          <Input
            id="file"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <div className="text-xs text-black/60">
            Tip: Keep Visual ID columns clean. Visual ID is what you’ll use outdoors.
          </div>
        </div>
      </div>

      {file ? (
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Column mapping</div>
              <div className="text-sm text-black/60">
                File: <span className="font-medium text-black">{file.name}</span> · Rows:{" "}
                <span className="font-medium text-black">{rows.length}</span>
              </div>
            </div>
            <Button disabled={isImporting} onClick={() => void runImport()}>
              Import
            </Button>
          </div>

          {requiredMissing.length ? (
            <div className="mt-3 text-sm text-orange-900">
              Required mappings missing: {requiredMissing.map((x) => x.label).join(", ")}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {DEFAULT_KEYS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>
                  {f.label} {f.required ? <span className="text-red-700">*</span> : null}
                </Label>
                <Select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [f.key]: e.target.value ? e.target.value : null }))
                  }
                >
                  <option value="">(not mapped)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {file && preview.length ? (
        <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className="border-b border-black/10 px-4 py-3 text-sm font-medium">Preview (first 20 rows)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/[0.02] text-black/70">
                <tr>
                  <th className="px-4 py-2">Row</th>
                  <th className="px-4 py-2">Visual ID</th>
                  <th className="px-4 py-2">Breed</th>
                  <th className="px-4 py-2">Sex</th>
                  <th className="px-4 py-2">Parents</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, idx) => {
                  const vid = formatVisualId({
                    visualIdType: readCell(r, mapping.visual_id_type),
                    visualIdColor: readCell(r, mapping.visual_id_color),
                    visualIdNumber: readCell(r, mapping.visual_id_number),
                  });
                  const breedPrimary = readCell(r, mapping.breed_primary);
                  const breedSecondary = readCell(r, mapping.breed_secondary);
                  const breed = breedSecondary ? `${breedPrimary} × ${breedSecondary}` : breedPrimary;
                  const sire = readCell(r, mapping.sire_unique_code);
                  const dam = readCell(r, mapping.dam_unique_code);
                  return (
                    <tr key={idx} className="border-t border-black/10">
                      <td className="px-4 py-2 text-black/60">{idx + 1}</td>
                      <td className="px-4 py-2 font-semibold">{vid}</td>
                      <td className="px-4 py-2">{breed || "—"}</td>
                      <td className="px-4 py-2">{readCell(r, mapping.sex) || "—"}</td>
                      <td className="px-4 py-2 text-black/70">
                        {sire ? `Sire: ${sire}` : "Sire: —"} · {dam ? `Dam: ${dam}` : "Dam: —"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <div className="text-sm font-medium">Import result</div>
          <div className="mt-1 text-sm text-black/70">
            Total: <span className="font-medium text-black">{result.rows_total}</span> · Created:{" "}
            <span className="font-medium text-black">{result.rows_created}</span> · Updated:{" "}
            <span className="font-medium text-black">{result.rows_updated}</span> · Failed:{" "}
            <span className="font-medium text-black">{result.rows_failed}</span>
          </div>

          {result.failures?.length ? (
            <div className="mt-3 overflow-hidden rounded-md border border-black/10">
              <div className="border-b border-black/10 px-3 py-2 text-sm font-medium">Failures</div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/[0.02] text-black/70">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failures.map((f, i) => (
                      <tr key={i} className="border-t border-black/10">
                        <td className="px-3 py-2 text-black/60">{f.row}</td>
                        <td className="px-3 py-2">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}



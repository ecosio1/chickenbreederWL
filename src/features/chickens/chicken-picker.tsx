"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { formatVisualId } from "./visual-id-format";

interface ChickenSearchItem {
  id: string;
  uniqueCode?: string;
  visualIdType?: string;
  visualIdColor?: string;
  visualIdNumber?: string;
  breedPrimary?: string;
  sex?: string;
}

export interface ChickenPickerProps {
  label: string;
  value: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
  allowedSexes?: Array<"rooster" | "hen" | "unknown">;
}

function formatOption(c: ChickenSearchItem): string {
  const vid = formatVisualId({
    visualIdType: c.visualIdType,
    visualIdColor: c.visualIdColor,
    visualIdNumber: c.visualIdNumber,
  });
  const code = c.uniqueCode ? `Code:${c.uniqueCode}` : "";
  const vidToken = vid !== "—" ? vid : "";
  const meta = [vidToken, code, c.sex, c.breedPrimary].filter(Boolean).join(" · ");
  return meta.length ? meta : c.id;
}

export function ChickenPicker({ label, value, onPick, onClear, allowedSexes }: ChickenPickerProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ChickenSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    let isCancelled = false;
    if (!canSearch) {
      setItems([]);
      return;
    }

    async function run() {
      setIsLoading(true);
      const sexFilters = allowedSexes?.length ? allowedSexes.map((s) => `&sex=${encodeURIComponent(s)}`).join("") : "";
      const res = await fetch(`/api/chickens?search=${encodeURIComponent(query)}&page_size=8${sexFilters}`);
      const body = await res.json().catch(() => null);
      if (isCancelled) return;
      setIsLoading(false);
      setItems(Array.isArray(body?.items) ? body.items : []);
    }

    const t = setTimeout(() => {
      void run();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(t);
    };
  }, [allowedSexes, canSearch, query]);

  return (
    <div className="rounded-md border border-black/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {value ? (
          <Button size="sm" variant="ghost" type="button" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>

      {value ? <div className="mt-2 text-sm text-black/60">Selected ID: {value}</div> : null}

      <div className="mt-2 flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code or Visual ID…" />
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? <div className="text-sm text-black/50">Searching…</div> : null}
        {!isLoading && canSearch && items.length === 0 ? (
          <div className="text-sm text-black/50">No matches.</div>
        ) : null}
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            className="min-h-11 w-full rounded-md border border-black/10 px-4 py-2 text-left text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            onClick={() => onPick(c.id)}
          >
            {formatOption(c)}
          </button>
        ))}
      </div>
    </div>
  );
}



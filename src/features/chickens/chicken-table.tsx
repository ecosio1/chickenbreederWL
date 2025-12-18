import Link from "next/link";
import { apiFetch, type ApiListResponse } from "../../server/api";
import type { ChickenDto } from "./types";
import { StatusBadge } from "../../ui/status-badge";
import { ChickenListMobile } from "./chicken-list-mobile";
import { ChickenRowActions } from "./chicken-row-actions";
import { VisualId } from "./visual-id";
import { EmptyState } from "../../ui/empty-state";
import { Button } from "../../ui/button";

function toQueryString(searchParams: Record<string, string | string[] | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => usp.append(key, v));
    else usp.set(key, value);
  }
  return usp.toString();
}

function hasMeaningfulFilters(searchParams: Record<string, string | string[] | undefined>): boolean {
  const ignored = new Set(["page", "page_size"]);
  for (const [key, value] of Object.entries(searchParams)) {
    if (ignored.has(key)) continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.some((v) => String(v).trim().length > 0)) return true;
      continue;
    }
    if (String(value).trim().length > 0) return true;
  }
  return false;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export async function ChickenTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = toQueryString(searchParams);
  const res = await apiFetch(`/api/chickens${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Failed to load chickens. {body?.error?.message ?? ""}
      </div>
    );
  }

  const data = (await res.json()) as ApiListResponse<ChickenDto>;
  const isFiltered = hasMeaningfulFilters(searchParams);

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-4 text-sm">
        <div className="text-black/70">
          Showing <span className="font-medium text-black">{data.items.length}</span> of{" "}
          <span className="font-medium text-black">{data.total}</span>
        </div>
        {data.total > 0 ? (
          <a href="/api/export/chickens.csv">
            <Button variant="secondary" size="sm">
              Export CSV
            </Button>
          </a>
        ) : null}
      </div>

      <div className="p-3 md:hidden">
        {data.total === 0 ? (
          <EmptyState
            title={isFiltered ? "No chickens match these filters" : "No chickens yet"}
            description={
              isFiltered
                ? "Try clearing your filters/search to see all chickens in this organization."
                : "Chickens are the core records in your org. Add your first chicken to start tracking status, parents, and breeding."
            }
            ctaLabel={isFiltered ? "Clear filters" : "Add your first chicken"}
            ctaHref={isFiltered ? "/chickens" : "/chickens/new"}
          />
        ) : (
          <ChickenListMobile items={data.items} />
        )}
      </div>

      <div className="hidden md:block">
        <div className="border-t border-black/10 bg-black/[0.02] text-sm text-black/70">
          <div className="grid grid-cols-[180px_160px_1fr_90px_120px_140px_1fr_64px] items-center px-4 py-3">
            <div>Visual ID</div>
            <div>Unique code</div>
            <div>Breed</div>
            <div>Sex</div>
            <div>Hatch</div>
            <div>Status</div>
            <div>Coop / Location</div>
            <div className="text-right">Actions</div>
          </div>
        </div>

        <div className="text-sm">
          {data.items.map((c) => (
            <div
              key={c.id}
              className="relative grid min-h-12 grid-cols-[180px_160px_1fr_90px_120px_140px_1fr_64px] items-center border-t border-black/10 px-4 py-2 hover:bg-black/[0.02]"
            >
              <Link href={`/chickens/${c.id}`} className="absolute inset-0" aria-label={`Open ${c.uniqueCode}`} />

              <div className="relative z-10">
                <VisualId visualIdType={c.visualIdType} visualIdColor={c.visualIdColor} visualIdNumber={c.visualIdNumber} />
              </div>
              <div className="relative z-10 text-black/70">{c.uniqueCode}</div>
              <div className="relative z-10">
                {c.breedSecondary ? `${c.breedPrimary} × ${c.breedSecondary}` : c.breedPrimary}
              </div>
              <div className="relative z-10">{c.sex}</div>
              <div className="relative z-10">{formatDate(c.hatchDate)}</div>
              <div className="relative z-10">
                <StatusBadge status={c.status} />
              </div>
              <div className="relative z-10">{c.coopLocationName ?? "—"}</div>
              <div className="relative z-10 flex justify-end">
                <ChickenRowActions id={c.id} currentStatus={c.status} coopLocationName={c.coopLocationName} />
              </div>
            </div>
          ))}

          {data.items.length === 0 ? (
            <div className="border-t border-black/10 p-4">
              <EmptyState
                title={isFiltered ? "No chickens match these filters" : "No chickens yet"}
                description={
                  isFiltered
                    ? "Try clearing your filters/search to see all chickens in this organization."
                    : "Chickens are the core records in your org. Add your first chicken to start tracking status, parents, and breeding."
                }
                ctaLabel={isFiltered ? "Clear filters" : "Add your first chicken"}
                ctaHref={isFiltered ? "/chickens" : "/chickens/new"}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}



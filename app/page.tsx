import Link from "next/link";
import { apiFetch } from "../src/server/api";
import { MetricCard } from "../src/features/dashboard/metric-card";
import { AlertCard } from "../src/features/dashboard/alert-card";
import { Button } from "../src/ui/button";
import { formatVisualId } from "../src/features/chickens/visual-id-format";

export default function HomePage() {
  return <DashboardPage />;
}

async function DashboardPage() {
  const [all, alive, sold, deceased] = await Promise.all([
    apiFetch("/api/chickens?page_size=1"),
    apiFetch("/api/chickens?status=alive&page_size=1"),
    apiFetch("/api/chickens?status=sold&page_size=1"),
    apiFetch("/api/chickens?status=deceased&page_size=1"),
  ]);

  const allBody = await all.json().catch(() => ({}));
  const aliveBody = await alive.json().catch(() => ({}));
  const soldBody = await sold.json().catch(() => ({}));
  const deceasedBody = await deceased.json().catch(() => ({}));

  const recentChickensRes = await apiFetch("/api/chickens?page_size=8");
  const recentChickensBody = await recentChickensRes.json().catch(() => ({}));
  const recentChickens = Array.isArray(recentChickensBody?.items) ? recentChickensBody.items : [];

  const breedingRes = await apiFetch("/api/breeding-events?limit=8");
  const breedingBody = await breedingRes.json().catch(() => ({}));
  const breeding = Array.isArray(breedingBody?.items) ? breedingBody.items : [];

  const missingVisualId = recentChickens.filter((c: any) => String(c?.visualIdNumber ?? "").startsWith("UNASSIGNED-"))
    .length;
  const missingHatchDate = recentChickens.filter((c: any) => !c?.hatchDate).length;

  // Risky pairings: check last 5 events only (fast and predictable)
  const recentEventsToCheck = breeding.slice(0, 5);
  const riskyCount = (
    await Promise.all(
      recentEventsToCheck.map(async (ev: any) => {
        const res = await apiFetch(
          `/api/breeding-events/pair-risk?sire_id=${encodeURIComponent(String(ev.sireId))}&dam_id=${encodeURIComponent(
            String(ev.damId),
          )}`,
        );
        const body = await res.json().catch(() => ({}));
        const warnings = Array.isArray(body?.warnings) ? body.warnings : [];
        return warnings.length > 0;
      }),
    )
  ).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1>Dashboard</h1>
          <p className="text-sm text-black/70">Fast overview for daily work.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/chickens/new">
            <Button>Add chicken</Button>
          </Link>
          <Link href="/breeding-events/new">
            <Button variant="secondary">Add breeding event</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total chickens" value={Number(allBody?.total ?? 0)} />
        <MetricCard label="Alive" value={Number(aliveBody?.total ?? 0)} />
        <MetricCard label="Sold" value={Number(soldBody?.total ?? 0)} />
        <MetricCard label="Deceased" value={Number(deceasedBody?.total ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-medium">Alerts</div>
          <AlertCard
            tone={missingVisualId > 0 ? "risk" : "info"}
            title="Missing Visual ID"
            description={
              missingVisualId > 0
                ? `${missingVisualId} recent chicken(s) have an unassigned Visual ID.`
                : "No recent chickens with missing Visual ID."
            }
            action={
              <Link href="/chickens">
                <Button variant="secondary">Review chickens</Button>
              </Link>
            }
          />
          <AlertCard
            tone="info"
            title="Missing hatch date"
            description={
              missingHatchDate > 0
                ? `${missingHatchDate} recent chicken(s) are missing a hatch date.`
                : "No recent chickens with missing hatch date."
            }
            action={
              <Link href="/chickens">
                <Button variant="secondary">Review chickens</Button>
              </Link>
            }
          />
          <AlertCard
            tone={riskyCount > 0 ? "risk" : "info"}
            title="Risky pairings"
            description={
              riskyCount > 0
                ? `${riskyCount} of the last ${recentEventsToCheck.length} breeding event(s) have warnings.`
                : `No warnings in the last ${recentEventsToCheck.length} breeding event(s).`
            }
            action={
              <Link href="/breeding-events">
                <Button variant="secondary">Review breeding</Button>
              </Link>
            }
          />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Recent activity</div>
          <div className="rounded-lg border border-black/10 bg-white">
            <div className="border-b border-black/10 px-4 py-3 text-sm font-medium">Recent chickens</div>
            <div className="divide-y divide-black/10">
              {recentChickens.map((c: any) => {
                const vid = formatVisualId({
                  visualIdType: c.visualIdType ?? null,
                  visualIdColor: c.visualIdColor ?? null,
                  visualIdNumber: c.visualIdNumber ?? null,
                });
                return (
                  <Link
                    key={String(c.id)}
                    href={`/chickens/${String(c.id)}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-black/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{vid}</div>
                      <div className="truncate text-xs text-black/60">{String(c.uniqueCode ?? "")}</div>
                    </div>
                    <div className="text-sm text-black/60">{String(c.status ?? "")}</div>
                  </Link>
                );
              })}
              {recentChickens.length === 0 ? (
                <div className="px-4 py-6 text-sm text-black/60">No chickens yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



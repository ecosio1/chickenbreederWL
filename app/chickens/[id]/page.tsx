import Link from "next/link";
import { apiFetch } from "../../../src/server/api";
import { Button } from "../../../src/ui/button";
import { formatVisualId } from "../../../src/features/chickens/visual-id-format";
import { LineageTree } from "../../../src/features/chickens/lineage-tree";
import { StatusBadge } from "../../../src/ui/status-badge";

export default async function ChickenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/api/chickens/${id}`);
  if (!res.ok) {
    return (
      <div className="space-y-3">
        <h1>Chicken</h1>
        <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/70">
          Not found.
        </div>
        <Link href="/chickens">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }

  const chicken = (await res.json()) as Record<string, unknown>;
  const visualId = formatVisualId({
    visualIdType: typeof chicken["visualIdType"] === "string" ? (chicken["visualIdType"] as string) : null,
    visualIdColor: typeof chicken["visualIdColor"] === "string" ? (chicken["visualIdColor"] as string) : null,
    visualIdNumber: typeof chicken["visualIdNumber"] === "string" ? (chicken["visualIdNumber"] as string) : null,
  });
  const uniqueCode = typeof chicken["uniqueCode"] === "string" ? (chicken["uniqueCode"] as string) : "";

  const offspringRes = await apiFetch(`/api/chickens?parent_id=${encodeURIComponent(id)}&page_size=25`);
  const offspringBody = await offspringRes.json().catch(() => ({}));
  const offspring = Array.isArray(offspringBody?.items) ? (offspringBody.items as Array<Record<string, any>>) : [];

  const sireId = typeof chicken["sireId"] === "string" ? (chicken["sireId"] as string) : null;
  const damId = typeof chicken["damId"] === "string" ? (chicken["damId"] as string) : null;
  const sire = (chicken as any).sire as Record<string, any> | null | undefined;
  const dam = (chicken as any).dam as Record<string, any> | null | undefined;

  const breedingAsSireRes = await apiFetch(`/api/breeding-events?sire_id=${encodeURIComponent(id)}`);
  const breedingAsDamRes = await apiFetch(`/api/breeding-events?dam_id=${encodeURIComponent(id)}`);
  const breedingAsSireBody = await breedingAsSireRes.json().catch(() => ({}));
  const breedingAsDamBody = await breedingAsDamRes.json().catch(() => ({}));
  const breedingEvents = [
    ...(Array.isArray(breedingAsSireBody?.items) ? breedingAsSireBody.items : []),
    ...(Array.isArray(breedingAsDamBody?.items) ? breedingAsDamBody.items : []),
  ] as Array<Record<string, any>>;
  const breedingById = new Map<string, Record<string, any>>();
  for (const ev of breedingEvents) if (ev?.id) breedingById.set(String(ev.id), ev);
  const breedingUnique = Array.from(breedingById.values());

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1>Chicken</h1>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-semibold text-black sm:text-lg">{visualId}</span>
            {uniqueCode ? <span className="text-xs text-black/60">{uniqueCode}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/chickens/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Link href="/chickens">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <div className="text-base font-semibold">Core fields</div>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-black/60">Breed</dt>
              <dd className="font-medium">
                {String((chicken as any).breedSecondary ? `${(chicken as any).breedPrimary} × ${(chicken as any).breedSecondary}` : (chicken as any).breedPrimary ?? "—")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/60">Sex</dt>
              <dd className="font-medium">{String((chicken as any).sex ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/60">Status</dt>
              <dd>
                <StatusBadge status={String((chicken as any).status ?? "")} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/60">Hatch date</dt>
              <dd className="font-medium">
                {typeof (chicken as any).hatchDate === "string" ? (chicken as any).hatchDate.slice(0, 10) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/60">Coop / Location</dt>
              <dd className="font-medium">{String((chicken as any).coopLocationName ?? "—")}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-4">
          <div className="text-base font-semibold">Parents</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-black/60">Sire</div>
              {sireId ? (
                <Link className="font-medium underline" href={`/chickens/${sireId}`}>
                  <span className="text-sm font-semibold text-black">
                    {formatVisualId({
                      visualIdType: sire?.visualIdType ?? null,
                      visualIdColor: sire?.visualIdColor ?? null,
                      visualIdNumber: sire?.visualIdNumber ?? null,
                    })}
                  </span>
                  {typeof sire?.uniqueCode === "string" && sire.uniqueCode ? (
                    <span className="ml-2 text-xs text-black/60">{sire.uniqueCode}</span>
                  ) : null}
                </Link>
              ) : (
                <div className="text-black/40">—</div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-black/60">Dam</div>
              {damId ? (
                <Link className="font-medium underline" href={`/chickens/${damId}`}>
                  <span className="text-sm font-semibold text-black">
                    {formatVisualId({
                      visualIdType: dam?.visualIdType ?? null,
                      visualIdColor: dam?.visualIdColor ?? null,
                      visualIdNumber: dam?.visualIdNumber ?? null,
                    })}
                  </span>
                  {typeof dam?.uniqueCode === "string" && dam.uniqueCode ? (
                    <span className="ml-2 text-xs text-black/60">{dam.uniqueCode}</span>
                  ) : null}
                </Link>
              ) : (
                <div className="text-black/40">—</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="text-base font-semibold">Lineage (parents + grandparents)</div>
        <div className="mt-3">
          <LineageTree chicken={chicken as any} />
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-4 py-3 text-base font-semibold">Offspring ({offspring.length})</div>

        <div className="grid grid-cols-1 gap-2 p-4 md:hidden">
          {offspring.map((c) => (
            <Link
              key={String(c.id)}
              href={`/chickens/${String(c.id)}`}
              className="block rounded-lg border border-black/10 bg-white p-4 hover:bg-black/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black">
                    {formatVisualId({
                      visualIdType: c.visualIdType ?? null,
                      visualIdColor: c.visualIdColor ?? null,
                      visualIdNumber: c.visualIdNumber ?? null,
                    })}
                  </div>
                  {c.uniqueCode ? <div className="mt-0.5 text-xs text-black/60">{String(c.uniqueCode)}</div> : null}
                </div>
                <div className="text-xs text-black/60">
                  {typeof c.hatchDate === "string" ? c.hatchDate.slice(0, 10) : "—"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <div className="text-xs text-black/60">Breed</div>
                  <div className="font-medium">
                    {c.breedSecondary ? `${c.breedPrimary} × ${c.breedSecondary}` : c.breedPrimary}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black/60">Sex</div>
                  <div className="font-medium">{String(c.sex ?? "")}</div>
                </div>
              </div>
            </Link>
          ))}
          {offspring.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60">
              No offspring recorded.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.02] text-black/70">
              <tr>
                <th className="px-4 py-2">Unique code</th>
                <th className="px-4 py-2">Visual ID</th>
                <th className="px-4 py-2">Breed</th>
                <th className="px-4 py-2">Sex</th>
                <th className="px-4 py-2">Hatch</th>
              </tr>
            </thead>
            <tbody>
              {offspring.map((c) => (
                <tr key={String(c.id)} className="border-t border-black/10">
                  <td className="px-4 py-2 text-xs text-black/60">
                    <Link className="underline" href={`/chickens/${String(c.id)}`}>
                      {String(c.uniqueCode ?? "")}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-sm font-semibold text-black">
                    {formatVisualId({
                      visualIdType: c.visualIdType ?? null,
                      visualIdColor: c.visualIdColor ?? null,
                      visualIdNumber: c.visualIdNumber ?? null,
                    })}
                  </td>
                  <td className="px-4 py-2">
                    {c.breedSecondary ? `${c.breedPrimary} × ${c.breedSecondary}` : c.breedPrimary}
                  </td>
                  <td className="px-4 py-2">{String(c.sex ?? "")}</td>
                  <td className="px-4 py-2">{typeof c.hatchDate === "string" ? c.hatchDate.slice(0, 10) : "—"}</td>
                </tr>
              ))}
              {offspring.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-black/60" colSpan={5}>
                    No offspring recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-4 py-3 text-base font-semibold">
          Breeding events ({breedingUnique.length})
        </div>

        <div className="grid grid-cols-1 gap-2 p-4 md:hidden">
          {breedingUnique.map((ev) => {
            const start = typeof ev.startDate === "string" ? ev.startDate.slice(0, 10) : "—";
            const end = typeof ev.endDate === "string" ? ev.endDate.slice(0, 10) : "";
            const label = end ? `${start} → ${end}` : start;

            const evSire = ev.sire ?? {};
            const evDam = ev.dam ?? {};

            return (
              <Link
                key={String(ev.id)}
                href={`/breeding-events/${String(ev.id)}`}
                className="block rounded-lg border border-black/10 bg-white p-4 hover:bg-black/[0.02]"
              >
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-black/60">Sire</span>
                    <div className="text-right leading-tight">
                      <div className="text-sm font-semibold text-black">
                        {formatVisualId({
                          visualIdType: evSire?.visualIdType ?? null,
                          visualIdColor: evSire?.visualIdColor ?? null,
                          visualIdNumber: evSire?.visualIdNumber ?? null,
                        })}
                      </div>
                      {typeof evSire?.uniqueCode === "string" && evSire.uniqueCode ? (
                        <div className="text-xs text-black/60">{evSire.uniqueCode}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-black/60">Dam</span>
                    <div className="text-right leading-tight">
                      <div className="text-sm font-semibold text-black">
                        {formatVisualId({
                          visualIdType: evDam?.visualIdType ?? null,
                          visualIdColor: evDam?.visualIdColor ?? null,
                          visualIdNumber: evDam?.visualIdNumber ?? null,
                        })}
                      </div>
                      {typeof evDam?.uniqueCode === "string" && evDam.uniqueCode ? (
                        <div className="text-xs text-black/60">{evDam.uniqueCode}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
                {ev?.notes ? <div className="mt-3 text-sm text-black/70">{String(ev.notes)}</div> : null}
              </Link>
            );
          })}
          {breedingUnique.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60">
              No breeding events recorded.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.02] text-black/70">
              <tr>
                <th className="px-4 py-2">Dates</th>
                <th className="px-4 py-2">Sire</th>
                <th className="px-4 py-2">Dam</th>
                <th className="px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {breedingUnique.map((ev) => {
                const start = typeof ev.startDate === "string" ? ev.startDate.slice(0, 10) : "—";
                const end = typeof ev.endDate === "string" ? ev.endDate.slice(0, 10) : "";
                const label = end ? `${start} → ${end}` : start;

                const evSire = ev.sire ?? {};
                const evDam = ev.dam ?? {};

                return (
                  <tr key={String(ev.id)} className="border-t border-black/10">
                    <td className="px-4 py-2">
                      <Link className="underline" href={`/breeding-events/${String(ev.id)}`}>
                        {label}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-black">
                          {formatVisualId({
                            visualIdType: evSire?.visualIdType ?? null,
                            visualIdColor: evSire?.visualIdColor ?? null,
                            visualIdNumber: evSire?.visualIdNumber ?? null,
                          })}
                        </div>
                        {typeof evSire?.uniqueCode === "string" && evSire.uniqueCode ? (
                          <div className="text-xs text-black/60">{evSire.uniqueCode}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-black">
                          {formatVisualId({
                            visualIdType: evDam?.visualIdType ?? null,
                            visualIdColor: evDam?.visualIdColor ?? null,
                            visualIdNumber: evDam?.visualIdNumber ?? null,
                          })}
                        </div>
                        {typeof evDam?.uniqueCode === "string" && evDam.uniqueCode ? (
                          <div className="text-xs text-black/60">{evDam.uniqueCode}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-black/70">{String(ev.notes ?? "")}</td>
                  </tr>
                );
              })}
              {breedingUnique.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-black/60" colSpan={4}>
                    No breeding events recorded.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



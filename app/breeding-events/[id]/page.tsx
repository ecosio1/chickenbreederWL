import Link from "next/link";
import { apiFetch } from "../../../src/server/api";
import { Button } from "../../../src/ui/button";
import { PageHeader } from "../../../src/ui/page-header";
import { formatVisualId } from "../../../src/features/chickens/visual-id-format";

function fmtDate(value: unknown): string {
  if (typeof value !== "string") return "—";
  return value.slice(0, 10);
}

function ParentLabel({
  uniqueCode,
  visualIdType,
  visualIdColor,
  visualIdNumber,
}: {
  uniqueCode?: string | null;
  visualIdType?: string | null;
  visualIdColor?: string | null;
  visualIdNumber?: string | null;
}) {
  const visualId = formatVisualId({ visualIdType, visualIdColor, visualIdNumber });
  const code = uniqueCode?.trim() ?? "";

  return (
    <div className="leading-tight">
      <div className="text-sm font-semibold text-black">{visualId}</div>
      {code ? <div className="text-xs text-black/60">{code}</div> : null}
    </div>
  );
}

export default async function BreedingEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventRes = await apiFetch(`/api/breeding-events/${id}`);
  const eventBody = await eventRes.json().catch(() => ({}));
  if (!eventRes.ok) {
    return (
      <div className="space-y-3">
        <h1>Breeding event</h1>
        <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/70">Not found.</div>
        <Link href="/breeding-events">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }

  const ev = eventBody as Record<string, any>;
  const sire = (ev.sire ?? {}) as Record<string, any>;
  const dam = (ev.dam ?? {}) as Record<string, any>;

  const offspringRes = await apiFetch(
    `/api/chickens?sire_id=${encodeURIComponent(String(ev.sireId))}&dam_id=${encodeURIComponent(String(ev.damId))}&page_size=50`,
  );
  const offspringBody = await offspringRes.json().catch(() => ({}));
  const offspring = Array.isArray(offspringBody?.items) ? (offspringBody.items as Array<Record<string, any>>) : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Breeding event"
        description={`${fmtDate(ev.startDate)}${ev.endDate ? ` → ${fmtDate(ev.endDate)}` : ""}`}
        actions={
          <>
            <Link href={`/breeding-events/${id}/offspring`}>
              <Button>Add offspring</Button>
            </Link>
            <Link href="/breeding-events">
              <Button variant="secondary">Back</Button>
            </Link>
          </>
        }
      />

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="text-sm">
            <div className="text-black/60">Sire</div>
            <ParentLabel
              uniqueCode={typeof sire?.uniqueCode === "string" ? sire.uniqueCode : null}
              visualIdType={typeof sire?.visualIdType === "string" ? sire.visualIdType : null}
              visualIdColor={typeof sire?.visualIdColor === "string" ? sire.visualIdColor : null}
              visualIdNumber={typeof sire?.visualIdNumber === "string" ? sire.visualIdNumber : null}
            />
          </div>
          <div className="text-sm">
            <div className="text-black/60">Dam</div>
            <ParentLabel
              uniqueCode={typeof dam?.uniqueCode === "string" ? dam.uniqueCode : null}
              visualIdType={typeof dam?.visualIdType === "string" ? dam.visualIdType : null}
              visualIdColor={typeof dam?.visualIdColor === "string" ? dam.visualIdColor : null}
              visualIdNumber={typeof dam?.visualIdNumber === "string" ? dam.visualIdNumber : null}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white">
        <div className="border-b border-black/10 px-4 py-4 text-base font-semibold">
          Offspring ({offspring.length})
        </div>

        <div className="grid grid-cols-1 gap-2 p-4 md:hidden">
          {offspring.map((c) => (
            <div key={String(c.id)} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-black/60">Unique code</div>
                  <div className="text-xs text-black/60">{String(c.uniqueCode ?? "")}</div>
                </div>
                <div>
                  <div className="text-black/60">Visual ID</div>
                  <div className="text-sm font-semibold text-black">
                    {formatVisualId({
                      visualIdType: c.visualIdType ?? null,
                      visualIdColor: c.visualIdColor ?? null,
                      visualIdNumber: c.visualIdNumber ?? null,
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-black/60">Sex</div>
                    <div className="font-medium">{String(c.sex ?? "")}</div>
                  </div>
                  <div>
                    <div className="text-black/60">Hatch</div>
                    <div className="font-medium">
                      {typeof c.hatchDate === "string" ? c.hatchDate.slice(0, 10) : "—"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-black/60">Breed</div>
                  <div className="font-medium">
                    {c.breedSecondary ? `${c.breedPrimary} × ${c.breedSecondary}` : c.breedPrimary}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {offspring.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60">
              No offspring recorded yet.
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
                  <td className="px-4 py-2 text-xs text-black/60">{String(c.uniqueCode ?? "")}</td>
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
                    No offspring recorded yet.
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



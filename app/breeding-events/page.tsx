import Link from "next/link";
import { apiFetch } from "../../src/server/api";
import { Button } from "../../src/ui/button";
import { PageHeader } from "../../src/ui/page-header";
import { formatVisualId } from "../../src/features/chickens/visual-id-format";
import { EmptyState } from "../../src/ui/empty-state";

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

export default async function BreedingEventsPage() {
  const res = await apiFetch("/api/breeding-events");
  const body = await res.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? (body.items as Array<Record<string, any>>) : [];
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Breeding events"
        description="Record sire/dam pairings and dates."
        actions={
          <>
            {hasItems ? (
              <a href="/api/export/breeding-events.csv">
                <Button variant="secondary">Export CSV</Button>
              </a>
            ) : null}
            <Link href="/breeding-events/new">
              <Button>Create</Button>
            </Link>
          </>
        }
      />

      {!res.ok ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Failed to load breeding events. {body?.error?.message ?? ""}
        </div>
      ) : (
        <div className="space-y-4">
          {!hasItems ? (
            <EmptyState
              title="No breeding events yet"
              description="Breeding events record which sire and dam were paired (and when), so you can later link offspring to those parents."
              ctaLabel="Record your first breeding event"
              ctaHref="/breeding-events/new"
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 md:hidden">
                {items.map((ev) => {
                  const sire = ev?.sire ?? {};
                  const dam = ev?.dam ?? {};

                  const startDate = typeof ev?.startDate === "string" ? ev.startDate.slice(0, 10) : "—";
                  const endDate = typeof ev?.endDate === "string" ? ev.endDate.slice(0, 10) : "";
                  const dateLabel = endDate ? `${startDate} → ${endDate}` : startDate;
                  const id = String(ev.id);

                  return (
                    <div key={id} className="relative rounded-lg border border-black/10 bg-white p-4">
                      <Link
                        href={`/breeding-events/${id}`}
                        className="absolute inset-0"
                        aria-label="Open breeding event"
                      />
                      <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="text-sm font-medium">{dateLabel}</div>
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
                          {ev?.notes ? <div className="text-sm text-black/70">{String(ev.notes)}</div> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-hidden rounded-lg border border-black/10 bg-white md:block">
                <div className="border-b border-black/10 bg-black/[0.02] text-sm text-black/70">
                  <div className="grid grid-cols-[160px_1fr_1fr_1fr_64px] items-center px-4 py-3">
                    <div>Dates</div>
                    <div>Sire</div>
                    <div>Dam</div>
                    <div>Notes</div>
                    <div className="text-right">Actions</div>
                  </div>
                </div>

                <div className="text-sm">
                  {items.map((ev) => {
                    const sire = ev?.sire ?? {};
                    const dam = ev?.dam ?? {};

                    const startDate = typeof ev?.startDate === "string" ? ev.startDate.slice(0, 10) : "—";
                    const endDate = typeof ev?.endDate === "string" ? ev.endDate.slice(0, 10) : "";
                    const dateLabel = endDate ? `${startDate} → ${endDate}` : startDate;
                    const id = String(ev.id);

                    return (
                      <div
                        key={id}
                        className="relative grid min-h-12 grid-cols-[160px_1fr_1fr_1fr_64px] items-center border-b border-black/10 px-4 py-2 hover:bg-black/[0.02]"
                      >
                        <Link
                          href={`/breeding-events/${id}`}
                          className="absolute inset-0"
                          aria-label="Open breeding event"
                        />

                        <div className="relative z-10">{dateLabel}</div>
                        <div className="relative z-10">
                          <ParentLabel
                            uniqueCode={typeof sire?.uniqueCode === "string" ? sire.uniqueCode : null}
                            visualIdType={typeof sire?.visualIdType === "string" ? sire.visualIdType : null}
                            visualIdColor={typeof sire?.visualIdColor === "string" ? sire.visualIdColor : null}
                            visualIdNumber={typeof sire?.visualIdNumber === "string" ? sire.visualIdNumber : null}
                          />
                        </div>
                        <div className="relative z-10">
                          <ParentLabel
                            uniqueCode={typeof dam?.uniqueCode === "string" ? dam.uniqueCode : null}
                            visualIdType={typeof dam?.visualIdType === "string" ? dam.visualIdType : null}
                            visualIdColor={typeof dam?.visualIdColor === "string" ? dam.visualIdColor : null}
                            visualIdNumber={typeof dam?.visualIdNumber === "string" ? dam.visualIdNumber : null}
                          />
                        </div>
                        <div className="relative z-10 text-black/70">{String(ev.notes ?? "")}</div>

                        <div className="relative z-10 flex justify-end">
                          <details className="relative">
                            <summary
                              className="cursor-pointer select-none rounded-md px-2 py-2 text-base leading-none hover:bg-black/5"
                              aria-label="Row actions"
                            >
                              ⋯
                            </summary>
                            <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg">
                              <Link className="block px-3 py-2 text-sm hover:bg-black/5" href={`/breeding-events/${id}`}>
                                View
                              </Link>
                              <Link
                                className="block px-3 py-2 text-sm hover:bg-black/5"
                                href={`/breeding-events/${id}/offspring`}
                              >
                                Add offspring
                              </Link>
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



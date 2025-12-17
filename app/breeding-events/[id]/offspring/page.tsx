import Link from "next/link";
import { apiFetch } from "../../../../src/server/api";
import { Button } from "../../../../src/ui/button";
import { OffspringBatchForm } from "../../../../src/features/breeding-events/offspring-batch-form";

export default async function AddOffspringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/api/breeding-events/${id}`);
  if (!res.ok) {
    return (
      <div className="space-y-3">
        <h1>Add offspring</h1>
        <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/70">Not found.</div>
        <Link href="/breeding-events">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }

  const breedingEvent = (await res.json()) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1>Add offspring</h1>
          <p className="text-sm text-black/70">Batch-create chicks linked to this breeding event’s parents.</p>
        </div>
        <Link href={`/breeding-events/${id}`}>
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <OffspringBatchForm breedingEventId={id} breedingEvent={breedingEvent} />
    </div>
  );
}



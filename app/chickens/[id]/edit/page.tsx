import Link from "next/link";
import { apiFetch } from "../../../../src/server/api";
import { Button } from "../../../../src/ui/button";
import { PageHeader } from "../../../../src/ui/page-header";
import { ChickenForm } from "../../../../src/features/chickens/chicken-form";

export default async function EditChickenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/api/chickens/${id}`);
  if (!res.ok) {
    return (
      <div className="space-y-3">
        <h1>Edit chicken</h1>
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit chicken"
        description="Update fields quickly, then save."
        actions={
          <Link href="/chickens">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <ChickenForm mode="edit" chickenId={id} initialValue={chicken} />
    </div>
  );
}



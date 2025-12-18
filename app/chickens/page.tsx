import Link from "next/link";
import { Suspense } from "react";
import { Button } from "../../src/ui/button";
import { PageHeader } from "../../src/ui/page-header";
import { ChickenFilters } from "../../src/features/chickens/chicken-filters";
import { ChickenTable } from "../../src/features/chickens/chicken-table";

export default async function ChickensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chickens"
        description="Search and manage birds within the current organization."
        actions={
          <Link href="/chickens/new">
            <Button>Add chicken</Button>
          </Link>
        }
      />

      <ChickenFilters />

      <Suspense fallback={<div className="text-sm text-black/60">Loading list…</div>}>
        <ChickenTable searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}



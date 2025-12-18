import Link from "next/link";
import { Button } from "../src/ui/button";
import { PageHeader } from "../src/ui/page-header";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Home"
        description="V1 focuses on chickens, breeding events, and import/export workflows."
        actions={
          <>
            <Link href="/chickens/new">
              <Button>Add chicken</Button>
            </Link>
            <Link href="/breeding-events/new">
              <Button variant="secondary">Create breeding event</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="text-sm font-medium">Chickens</div>
          <p className="mt-2 text-sm text-black/70">Search, create, edit, and track status + location.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/chickens">
              <Button variant="secondary">Open list</Button>
            </Link>
            <Link href="/chickens/new">
              <Button>Add chicken</Button>
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="text-sm font-medium">Breeding</div>
          <p className="mt-2 text-sm text-black/70">Record sire/dam pairings, review warnings, add offspring.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/breeding-events">
              <Button variant="secondary">Open list</Button>
            </Link>
            <Link href="/breeding-events/new">
              <Button>Create event</Button>
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4 md:col-span-2">
          <div className="text-sm font-medium">Data (Import / Export)</div>
          <p className="mt-2 text-sm text-black/70">
            V1 supports CSV/Excel workflows for moving data in/out. V1 does not include analytics dashboards.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/data">
              <Button variant="secondary">Open Data</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}



import Link from "next/link";
import { EmptyState } from "../../src/ui/empty-state";

export default function CoopsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Coops / Locations</h1>
        <p className="text-sm text-black/70">
          Coops help you track where birds are housed. In V1, location is stored as free text on each chicken.
        </p>
      </div>

      <EmptyState
        title="Coops management is coming next"
        description="For now, set a chicken’s “Coop / Location” directly on the chicken record to keep your flock organized."
        ctaLabel="Go to Chickens"
        ctaHref="/chickens"
      />
    </div>
  );
}



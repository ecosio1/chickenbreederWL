import Link from "next/link";
import { Button } from "../../../src/ui/button";
import { PageHeader } from "../../../src/ui/page-header";
import { BreedingEventForm } from "../../../src/features/breeding-events/breeding-event-form";

export default function NewBreedingEventPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Create breeding event"
        description="Pick sire/dam, set dates, review risk warnings, then save."
        actions={
          <Link href="/breeding-events">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <BreedingEventForm />
    </div>
  );
}



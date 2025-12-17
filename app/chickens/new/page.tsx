import Link from "next/link";
import { Button } from "../../../src/ui/button";
import { PageHeader } from "../../../src/ui/page-header";
import { ChickenForm } from "../../../src/features/chickens/chicken-form";

export default function NewChickenPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add chicken"
        description="Fast entry: Visual ID, breed, sex, status, location."
        actions={
          <Link href="/chickens">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <ChickenForm mode="create" />
    </div>
  );
}



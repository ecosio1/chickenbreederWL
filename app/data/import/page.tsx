import Link from "next/link";
import { Button } from "../../../src/ui/button";
import { ImportChickens } from "../../../src/features/data/import-chickens";

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Import chickens</h1>
          <p className="text-sm text-black/70">Upload, map columns, preview rows, then import.</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/import/chickens/template.csv">
            <Button variant="secondary">Template CSV</Button>
          </a>
          <Link href="/data">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      <ImportChickens />
    </div>
  );
}



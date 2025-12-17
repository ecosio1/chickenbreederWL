import { Button } from "../../src/ui/button";

export default function DataPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Data</h1>
        <p className="text-sm text-black/70">Import and export for Excel workflows (org-scoped).</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium">Import</h2>
          <p className="mt-1 text-sm text-black/70">
            Download the template CSV, fill it in Excel, then import via API (UI mapping is V1.1).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/import/chickens/template.csv">
              <Button variant="secondary">Download template CSV</Button>
            </a>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-sm font-medium">Export</h2>
          <p className="mt-1 text-sm text-black/70">One click exports with parent unique codes included.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/export/chickens.csv">
              <Button variant="secondary">Export chickens CSV</Button>
            </a>
            <a href="/api/export/breeding-events.csv">
              <Button variant="secondary">Export breeding events CSV</Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}



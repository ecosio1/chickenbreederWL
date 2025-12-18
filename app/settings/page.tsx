import Link from "next/link";
import { Button } from "../../src/ui/button";
import { PageHeader } from "../../src/ui/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="V1 intentionally keeps settings minimal." />

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="text-sm font-medium">V1 exclusions</div>
        <ul className="mt-2 space-y-2 text-sm text-black/70">
          <li>No genetic scoring</li>
          <li>No photo uploads</li>
          <li>No advanced permissions UI</li>
          <li>No analytics dashboards</li>
          <li>No coop maps</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/data">
            <Button variant="secondary">Go to Data</Button>
          </Link>
          <Link href="/chickens">
            <Button variant="secondary">Go to Chickens</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}



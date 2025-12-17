import Link from "next/link";
import { Button } from "../../src/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-black/70">Organization settings, roles, and preferences (V1).</p>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="text-sm font-medium">Members</div>
        <p className="mt-1 text-sm text-black/70">
          Owners can manage members via API endpoints (UI is V1.1).
        </p>
        <div className="mt-3">
          <Link href="/data">
            <Button variant="secondary">Go to Data</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}



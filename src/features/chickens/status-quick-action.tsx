"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "../../ui/select";
import { dotClassForStatus, statusTone } from "../../ui/semantic-colors";

export function ChickenStatusQuickAction({ id, currentStatus }: { id: string; currentStatus: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(nextStatus: string) {
    startTransition(async () => {
      await fetch(`/api/chickens/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className={dotClassForStatus(statusTone(currentStatus))} aria-hidden="true" />
      <Select disabled={isPending} value={currentStatus} onChange={(e) => onChange(e.target.value)}>
        <option value="alive">alive</option>
        <option value="sold">sold</option>
        <option value="deceased">deceased</option>
      </Select>
    </div>
  );
}



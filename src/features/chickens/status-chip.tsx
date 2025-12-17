"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "../../ui/cn";
import { badgeClassForStatus, dotClassForStatus, statusTone } from "../../ui/semantic-colors";

const STATUSES = ["alive", "sold", "deceased"] as const;

function formatStatusDateForTitle(value: string | null | undefined): string {
  if (!value) return "Status date: —";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Status date: —";
  return `Status date: ${d.toISOString().slice(0, 10)}`;
}

export interface StatusChipProps {
  id: string;
  status: string | null | undefined;
  statusDate?: string | null;
  isEditable?: boolean;
  className?: string;
}

export function StatusChip({ id, status, statusDate, isEditable = true, className }: StatusChipProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tone = statusTone(status ?? null);
  const label = status ?? "unknown";

  function setStatus(nextStatus: (typeof STATUSES)[number]) {
    startTransition(async () => {
      await fetch(`/api/chickens/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    });
  }

  if (!isEditable)
    return (
      <span className={cn(badgeClassForStatus(tone), className)} title={formatStatusDateForTitle(statusDate)}>
        <span className={dotClassForStatus(tone)} aria-hidden="true" />
        <span>{label}</span>
      </span>
    );

  return (
    <details className={cn("relative inline-block", className)}>
      <summary
        className={cn(
          badgeClassForStatus(tone),
          "cursor-pointer select-none",
          "hover:bg-black/[0.02]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
          isPending && "opacity-60",
        )}
        title={formatStatusDateForTitle(statusDate)}
        aria-disabled={isPending}
      >
        <span className={dotClassForStatus(tone)} aria-hidden="true" />
        <span>{label}</span>
      </summary>

      <div className="absolute left-0 z-10 mt-2 w-40 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg">
        <div className="px-2 py-1 text-xs font-medium text-black/60">Change status</div>
        <div className="border-t border-black/10" />
        <div className="p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                setStatus(s);
                const details = (e.currentTarget.closest("details") as HTMLDetailsElement | null) ?? null;
                if (details) details.open = false;
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                "hover:bg-black/5",
                s === status && "bg-black/[0.03] font-medium",
                isPending && "cursor-not-allowed opacity-60",
              )}
            >
              <span className={dotClassForStatus(statusTone(s))} aria-hidden="true" />
              <span className="capitalize">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}


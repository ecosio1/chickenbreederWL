"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "../../ui/cn";
import { badgeClassForStatus, dotClassForStatus, statusTone } from "../../ui/semantic-colors";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/dropdown-menu";

const STATUSES = ["alive", "sold", "deceased"] as const;

function formatStatusDate(value: string | null | undefined): { inline: string; a11y: string } {
  if (!value) return { inline: "—", a11y: "Status date unknown." };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { inline: "—", a11y: "Status date unknown." };
  const iso = d.toISOString().slice(0, 10);
  return { inline: iso, a11y: `Status date ${iso}.` };
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
  const date = formatStatusDate(statusDate);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button
          type="button"
          className={cn(
            badgeClassForStatus(tone),
            "min-h-10 select-none",
            "hover:bg-black/[0.02]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
            isPending && "cursor-not-allowed opacity-60",
            className,
          )}
          aria-label={`Status: ${label}. ${date.a11y} ${isEditable ? "Activate to change status." : "Activate to view details."}`}
        >
          <span className={dotClassForStatus(tone)} aria-hidden="true" />
          <span className="capitalize">{label}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <div className="px-2 py-1 text-xs font-medium text-black/60">Status date</div>
        <div className="px-2 pb-1 text-xs text-black/70">{date.inline}</div>

        {isEditable ? (
          <>
            <DropdownMenuSeparator />
            {STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={isPending || s === status}
                onSelect={() => setStatus(s)}
                className={cn("flex items-center gap-2", s === status && "font-medium")}
              >
                <span className={dotClassForStatus(statusTone(s))} aria-hidden="true" />
                <span className="capitalize">{s}</span>
                {s === status ? <span className="ml-auto text-xs text-black/50">(current)</span> : null}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


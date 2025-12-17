"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

interface ChickenRowActionsProps {
  id: string;
  currentStatus: string;
  coopLocationName: string | null;
}

async function patchChicken(id: string, body: Record<string, unknown>) {
  await fetch(`/api/chickens/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ChickenRowActions({ id, currentStatus, coopLocationName }: ChickenRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function goTo(path: Route) {
    router.push(path as any);
  }

  function setStatus(nextStatus: string) {
    startTransition(async () => {
      await patchChicken(id, { status: nextStatus });
      router.refresh();
    });
  }

  function moveCoop() {
    const next = window.prompt("Move coop / location (leave blank to clear):", coopLocationName ?? "");
    if (next === null) return;

    startTransition(async () => {
      await patchChicken(id, { coop_location_name: next.trim() ? next.trim() : null });
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 w-11 px-0 text-base leading-none"
          aria-label="Row actions"
          disabled={isPending}
        >
          ⋯
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => goTo(`/chickens/${id}` as Route)}>View</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => goTo(`/chickens/${id}/edit` as Route)}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={moveCoop}>Move coop</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={currentStatus === "alive"} onSelect={() => setStatus("alive")}>
          Mark alive
        </DropdownMenuItem>
        <DropdownMenuItem disabled={currentStatus === "sold"} onSelect={() => setStatus("sold")}>
          Mark sold
        </DropdownMenuItem>
        <DropdownMenuItem disabled={currentStatus === "deceased"} onSelect={() => setStatus("deceased")}>
          Mark deceased
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

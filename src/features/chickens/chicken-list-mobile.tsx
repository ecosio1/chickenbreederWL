"use client";

import type { PointerEvent } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../ui/button";
import { VisualIdBadge } from "./visual-id";
import { StatusChip } from "./status-chip";
import type { ChickenDto } from "./types";

interface ChickenListMobileProps {
  items: ChickenDto[];
}

async function patchChicken(id: string, body: Record<string, unknown>) {
  await fetch(`/api/chickens/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

type SwipeOpen = "none" | "left" | "right";

function ChickenCard({ chicken }: { chicken: ChickenDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [offsetX, setOffsetX] = useState(0);
  const [open, setOpen] = useState<SwipeOpen>("none");

  const startRef = useRef<{ x: number; y: number; offsetAtStart: number } | null>(null);
  const isSwipingRef = useRef(false);

  const max = 140;

  const foregroundClassName = useMemo(() => {
    const isDragging = Boolean(startRef.current);
    return [
      "relative",
      "rounded-lg border border-black/10 bg-white p-4",
      "will-change-transform",
      isDragging ? "transition-none" : "transition-transform duration-150",
    ].join(" ");
  }, [offsetX]);

  function closeSwipe() {
    setOpen("none");
    setOffsetX(0);
  }

  function commitOpen(next: SwipeOpen) {
    setOpen(next);
    setOffsetX(next === "right" ? max : next === "left" ? -max : 0);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("button,a,select,option")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, offsetAtStart: offsetX };
    isSwipingRef.current = false;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (!isSwipingRef.current) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        startRef.current = null;
        return;
      }
      if (Math.abs(dx) < 10) return;
      isSwipingRef.current = true;
    }

    const next = Math.max(-max, Math.min(max, start.offsetAtStart + dx));
    setOffsetX(next);
  }

  function onPointerUp() {
    if (!startRef.current) return;
    startRef.current = null;

    if (offsetX > 60) commitOpen("right");
    else if (offsetX < -60) commitOpen("left");
    else commitOpen("none");
  }

  function setStatus(nextStatus: string) {
    startTransition(async () => {
      await patchChicken(chicken.id, { status: nextStatus });
      closeSwipe();
      router.refresh();
    });
  }

  function moveCoop() {
    const next = window.prompt("Move coop / location (leave blank to clear):", chicken.coopLocationName ?? "");
    if (next === null) return;

    startTransition(async () => {
      await patchChicken(chicken.id, { coop_location_name: next.trim() ? next.trim() : null });
      closeSwipe();
      router.refresh();
    });
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-black/10 bg-black/[0.02]">
      <div className="absolute inset-0 flex items-stretch justify-between">
        <div className="flex w-[140px] flex-col justify-center gap-2 px-3">
          <div className="text-xs font-medium text-black/60">Change status</div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              variant={chicken.status === "alive" ? "secondary" : "default"}
              disabled={isPending}
              onClick={() => setStatus("alive")}
            >
              Alive
            </Button>
            <Button
              type="button"
              size="sm"
              variant={chicken.status === "sold" ? "secondary" : "default"}
              disabled={isPending}
              onClick={() => setStatus("sold")}
            >
              Sold
            </Button>
            <Button
              type="button"
              size="sm"
              variant={chicken.status === "deceased" ? "secondary" : "destructive"}
              disabled={isPending}
              onClick={() => setStatus("deceased")}
            >
              Deceased
            </Button>
          </div>
        </div>

        <div className="flex w-[140px] items-center justify-end px-3">
          <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={moveCoop}>
            Move coop
          </Button>
        </div>
      </div>

      <div
        className={foregroundClassName}
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button,a,select,option")) return;
          if (open !== "none") {
            closeSwipe();
            return;
          }
          router.push(`/chickens/${chicken.id}`);
        }}
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-black">{chicken.uniqueCode}</div>
              <VisualIdBadge
                visualIdType={chicken.visualIdType}
                visualIdColor={chicken.visualIdColor}
                visualIdNumber={chicken.visualIdNumber}
              />
            </div>
            <StatusChip id={chicken.id} status={chicken.status} statusDate={chicken.statusDate} isEditable={false} />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <div className="text-xs text-black/60">Breed</div>
              <div className="font-medium">
                {chicken.breedSecondary ? `${chicken.breedPrimary} × ${chicken.breedSecondary}` : chicken.breedPrimary}
              </div>
            </div>
            <div>
              <div className="text-xs text-black/60">Sex</div>
              <div className="font-medium">{chicken.sex}</div>
            </div>
            <div>
              <div className="text-xs text-black/60">Hatch</div>
              <div className="font-medium">{formatDate(chicken.hatchDate)}</div>
            </div>
            <div>
              <div className="text-xs text-black/60">Coop</div>
              <div className="font-medium">{chicken.coopLocationName ?? "—"}</div>
            </div>
          </div>

          {open !== "none" ? (
            <div className="text-xs text-black/60">Tip: swipe back to close</div>
          ) : (
            <div className="text-xs text-black/60">Swipe right for status • Swipe left for coop</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChickenListMobile({ items }: ChickenListMobileProps) {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((c) => (
        <ChickenCard key={c.id} chicken={c} />
      ))}
      {items.length === 0 ? <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60">No chickens found.</div> : null}
    </div>
  );
}

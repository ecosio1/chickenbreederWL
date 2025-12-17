"use client";

import Link from "next/link";
import type { Route } from "next";
import type { UrlObject } from "url";
import { cn } from "../../ui/cn";
import { VisualIdBadge } from "./visual-id";
import { formatVisualId, type VisualIdParts } from "./visual-id-format";
import { StatusChip } from "./status-chip";

export interface BirdPreviewCardChicken extends VisualIdParts {
  id: string;
  uniqueCode?: string | null;
  status?: string | null;
  statusDate?: string | null;
  breedPrimary?: string | null;
  breedSecondary?: string | null;
  sex?: string | null;
  coopLocationName?: string | null;
}

export interface BirdPreviewCardProps {
  chicken: BirdPreviewCardChicken;
  href?: Route | UrlObject;
  isStatusEditable?: boolean;
  className?: string;
}

function formatBreed(chicken: BirdPreviewCardChicken): string {
  const primary = chicken.breedPrimary?.trim() ?? "";
  const secondary = chicken.breedSecondary?.trim() ?? "";
  if (!primary && !secondary) return "—";
  if (primary && secondary) return `${primary} × ${secondary}`;
  return primary || secondary;
}

function formatSex(sex: string | null | undefined): string {
  if (!sex) return "—";
  return sex;
}

export function BirdPreviewCard({ chicken, href, isStatusEditable = false, className }: BirdPreviewCardProps) {
  const targetHref: Route | UrlObject =
    href ?? ({ pathname: "/chickens/[id]", query: { id: chicken.id } } satisfies UrlObject);

  const content = (
    <div className={cn("rounded-lg border border-black/10 bg-white p-4 hover:bg-black/[0.02]", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <VisualIdBadge
            visualIdType={chicken.visualIdType}
            visualIdColor={chicken.visualIdColor}
            visualIdNumber={chicken.visualIdNumber}
          />
          <div className="mt-2 truncate text-sm text-black/60">
            {chicken.uniqueCode ? `Code: ${chicken.uniqueCode}` : formatVisualId(chicken)}
          </div>
        </div>
        <StatusChip id={chicken.id} status={chicken.status} statusDate={chicken.statusDate} isEditable={isStatusEditable} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-black/80">
        <div className="flex flex-wrap gap-x-2">
          <span className="text-black/60">Breed:</span>
          <span className="font-medium">{formatBreed(chicken)}</span>
          <span className="text-black/30">·</span>
          <span className="text-black/60">Sex:</span>
          <span className="font-medium">{formatSex(chicken.sex)}</span>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <span className="text-black/60">Location:</span>
          <span className="font-medium">{chicken.coopLocationName?.trim() || "—"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Link href={targetHref as any} className="block">
      {content}
    </Link>
  );
}


"use client";

import * as React from "react";
import { cn } from "../../ui/cn";
import { formatVisualId, type VisualIdParts } from "./visual-id-format";

export type { VisualIdParts };
export { formatVisualId } from "./visual-id-format";

export function VisualId({
  visualIdType,
  visualIdColor,
  visualIdNumber,
  className,
}: VisualIdParts & { className?: string }) {
  return (
    <span className={cn("text-sm font-semibold text-black", className)}>
      {formatVisualId({ visualIdType, visualIdColor, visualIdNumber })}
    </span>
  );
}

export function VisualIdBadge({
  visualIdType,
  visualIdColor,
  visualIdNumber,
  className,
}: VisualIdParts & { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-black px-2.5 py-1 font-mono text-sm font-semibold text-white",
        "ring-1 ring-black/10",
        className,
      )}
    >
      {formatVisualId({ visualIdType, visualIdColor, visualIdNumber })}
    </span>
  );
}



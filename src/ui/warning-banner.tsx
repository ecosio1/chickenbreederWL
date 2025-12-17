"use client";

import * as React from "react";
import { cn } from "./cn";
import { dotClassForWarning, type WarningTone } from "./semantic-colors";

function iconClassForTone(tone: WarningTone) {
  if (tone === "critical") return "text-red-700";
  if (tone === "risk") return "text-orange-700";
  return "text-slate-600";
}

function surfaceClassForTone(tone: WarningTone) {
  if (tone === "critical") return "border-red-600/25 bg-red-50 text-red-950";
  if (tone === "risk") return "border-orange-500/25 bg-orange-50 text-orange-950";
  return "border-black/10 bg-white text-black/80";
}

export interface WarningBannerProps {
  tone: WarningTone;
  title: string;
  message: string;
  className?: string;
}

export function WarningBanner({ tone, title, message, className }: WarningBannerProps) {
  return (
    <div className={cn("rounded-md border px-4 py-2 text-sm", surfaceClassForTone(tone), className)} role="status">
      <div className="flex items-start gap-2">
        <span className={dotClassForWarning(tone)} aria-hidden="true" />
        <svg
          viewBox="0 0 24 24"
          className={cn("mt-0.5 h-4 w-4 shrink-0", iconClassForTone(tone))}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 9v4" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
          <path d="M10.3 3.4h3.4L22 20.6H2L10.3 3.4Z" strokeLinejoin="round" />
        </svg>
        <div className="space-y-2">
          <div className="font-medium">{title}</div>
          <div className="text-black/80">{message}</div>
        </div>
      </div>
    </div>
  );
}


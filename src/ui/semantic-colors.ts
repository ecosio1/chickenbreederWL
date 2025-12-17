import { cn } from "./cn";

export type StatusTone = "alive" | "sold" | "deceased";
export type WarningTone = "critical" | "risk" | "info";

export function statusTone(value: string | null | undefined): StatusTone | null {
  if (value === "alive") return "alive";
  if (value === "sold") return "sold";
  if (value === "deceased") return "deceased";
  return null;
}

export function warningTone(value: string | null | undefined): WarningTone {
  if (value === "parent_child") return "critical";
  if (value === "full_siblings") return "risk";
  if (value === "half_siblings") return "risk";
  if (value === "shared_grandparent") return "risk";
  return "info";
}

export function dotClassForStatus(tone: StatusTone | null) {
  return cn(
    "inline-block h-3 w-3 shrink-0 rounded-full border border-black/10",
    tone === "alive" && "bg-green-600",
    tone === "sold" && "bg-slate-500", // neutral grey (Excel-friendly + high contrast)
    tone === "deceased" && "bg-red-600",
    !tone && "bg-black/20",
  );
}

export function dotClassForWarning(tone: WarningTone) {
  return cn(
    "inline-block h-3 w-3 shrink-0 rounded-full border border-black/10",
    tone === "critical" && "bg-red-600",
    tone === "risk" && "bg-orange-500",
    tone === "info" && "bg-slate-400",
  );
}

export function badgeClassForStatus(tone: StatusTone | null) {
  // neutral background, colored border/text (color is not the only indicator)
  return cn(
    "inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-medium",
    "bg-white",
    tone === "alive" && "border-green-600/40 text-green-800",
    tone === "sold" && "border-slate-500/40 text-slate-700",
    tone === "deceased" && "border-red-600/40 text-red-800",
    !tone && "border-black/10 text-black/60",
  );
}

export function badgeClassForWarning(tone: WarningTone) {
  return cn(
    "rounded-md border px-3 py-2 text-sm",
    "bg-white",
    tone === "critical" && "border-red-600/30 text-red-900",
    tone === "risk" && "border-orange-500/30 text-orange-900",
    tone === "info" && "border-black/10 text-black/70",
  );
}



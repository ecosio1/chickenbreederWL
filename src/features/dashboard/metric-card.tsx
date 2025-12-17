import { cn } from "../../ui/cn";

export function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <div className="text-sm text-black/60">{label}</div>
      <div className={cn("mt-1 text-3xl font-semibold tracking-tight")}>{value}</div>
      {sublabel ? <div className="mt-1 text-sm text-black/60">{sublabel}</div> : null}
    </div>
  );
}



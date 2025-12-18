import Link from "next/link";
import { Button } from "./button";
import { cn } from "./cn";

export interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export function EmptyState({ title, description, ctaLabel, ctaHref, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-lg border border-black/10 bg-white p-6", className)}>
      <div className="space-y-1">
        <div className="text-base font-semibold text-black">{title}</div>
        <p className="text-sm text-black/70">{description}</p>
      </div>
      <div className="mt-4">
        <Link href={ctaHref}>
          <Button>{ctaLabel}</Button>
        </Link>
      </div>
    </div>
  );
}


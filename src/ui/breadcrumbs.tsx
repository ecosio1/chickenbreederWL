import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-sm text-black/60">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {idx > 0 ? <span className="text-black/30">/</span> : null}
              {item.href && !isLast ? (
                <Link className="underline hover:text-black" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-black" : ""}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}



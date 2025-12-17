import * as React from "react";
import Link from "next/link";
import { formatVisualId } from "./visual-id-format";

interface ChickenNode {
  id: string;
  uniqueCode?: string | null;
  visualIdType?: string | null;
  visualIdColor?: string | null;
  visualIdNumber?: string | null;
  sire?: ChickenNode | null;
  dam?: ChickenNode | null;
}

function NodeCard({ node }: { node: ChickenNode | null | undefined }) {
  if (!node)
    return (
      <div className="rounded-md border border-dashed border-black/10 bg-white px-3 py-2 text-xs text-black/40">
        Unknown
      </div>
    );

  return (
    <Link
      href={`/chickens/${node.id}`}
      className="block rounded-md border border-black/10 bg-white px-3 py-2 hover:bg-black/[0.02]"
    >
      <div className="text-sm font-semibold text-black">
        {formatVisualId({
          visualIdType: node.visualIdType ?? null,
          visualIdColor: node.visualIdColor ?? null,
          visualIdNumber: node.visualIdNumber ?? null,
        })}
      </div>
      <div className="text-xs text-black/60">{node.uniqueCode ?? "—"}</div>
    </Link>
  );
}

export function LineageTree({
  chicken,
}: {
  chicken: {
    id: string;
    uniqueCode?: string | null;
    visualIdType?: string | null;
    visualIdColor?: string | null;
    visualIdNumber?: string | null;
    sire?: ChickenNode | null;
    dam?: ChickenNode | null;
  };
}) {
  const sire = chicken.sire ?? null;
  const dam = chicken.dam ?? null;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="space-y-2">
        <div className="text-xs font-medium text-black/60">Parents</div>
        <NodeCard node={sire} />
        <NodeCard node={dam} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <div className="text-xs font-medium text-black/60">Grandparents</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-black/50">Sire’s parents</div>
            <NodeCard node={sire?.sire ?? null} />
            <NodeCard node={sire?.dam ?? null} />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-black/50">Dam’s parents</div>
            <NodeCard node={dam?.sire ?? null} />
            <NodeCard node={dam?.dam ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}



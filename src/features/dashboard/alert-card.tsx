import * as React from "react";
import { badgeClassForWarning, dotClassForWarning, type WarningTone } from "../../ui/semantic-colors";

export function AlertCard({
  tone,
  title,
  description,
  action,
}: {
  tone: WarningTone;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={badgeClassForWarning(tone)}>
      <div className="flex items-start gap-2">
        <span className={dotClassForWarning(tone)} aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <div className="font-medium">{title}</div>
          <div className="text-sm">{description}</div>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}



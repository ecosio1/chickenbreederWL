"use client";

import * as React from "react";
import { Button } from "../../ui/button";

export function ExportLink({ href, label }: { href: string; label: string }) {
  const [message, setMessage] = React.useState<string | null>(null);

  function onClick() {
    setMessage("Download started. If nothing happens, check pop-up/download settings.");
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <div className="space-y-2">
      <a href={href} onClick={onClick}>
        <Button variant="secondary">{label}</Button>
      </a>
      {message ? <div className="text-xs text-black/60">{message}</div> : null}
    </div>
  );
}



"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit() {
    const q = value.trim();
    router.push(q ? `/chickens?search=${encodeURIComponent(q)}` : "/chickens");
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search Visual ID or code…"
        aria-label="Global search"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
      />
      <Button type="button" variant="secondary" onClick={onSubmit}>
        Search
      </Button>
    </div>
  );
}



import { badgeClassForStatus, dotClassForStatus, statusTone } from "./semantic-colors";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status ?? null);
  return (
    <span className={badgeClassForStatus(tone)}>
      <span className={dotClassForStatus(tone)} aria-hidden="true" />
      <span>{status ?? "unknown"}</span>
    </span>
  );
}



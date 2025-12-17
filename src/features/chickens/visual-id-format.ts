export interface VisualIdParts {
  visualIdType?: string | null;
  visualIdColor?: string | null;
  visualIdNumber?: string | null;
}

export function formatVisualId(parts: VisualIdParts): string {
  const type = parts.visualIdType?.trim() ?? "";
  const color = parts.visualIdColor?.trim() ?? "";
  const number = parts.visualIdNumber?.trim() ?? "";

  const tokens: string[] = [];
  if (type) tokens.push(type);
  if (color) tokens.push(color);
  if (number) tokens.push(`#${number}`);

  return tokens.join(" | ") || "—";
}


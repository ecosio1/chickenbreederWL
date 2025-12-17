export interface RememberedChickenDefaults {
  visualIdType?: "zip_tie" | "leg_band" | "metal_band" | "other";
  visualIdColor?: string;
  breedPrimary?: string;
  breedSecondary?: string | null;
}

const STORAGE_KEY = "wlcb.last_used.chicken_defaults.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s) return undefined;
  return s.slice(0, 80);
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return normalizeOptionalString(value);
}

function normalizeVisualIdType(value: unknown): RememberedChickenDefaults["visualIdType"] | undefined {
  if (value === "zip_tie" || value === "leg_band" || value === "metal_band" || value === "other") return value;
  return undefined;
}

export function loadRememberedChickenDefaults(): RememberedChickenDefaults {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") return {};

  const obj = parsed as Record<string, unknown>;
  return {
    visualIdType: normalizeVisualIdType(obj.visualIdType),
    visualIdColor: normalizeOptionalString(obj.visualIdColor),
    breedPrimary: normalizeOptionalString(obj.breedPrimary),
    breedSecondary: normalizeNullableString(obj.breedSecondary),
  };
}

export function saveRememberedChickenDefaults(next: RememberedChickenDefaults): void {
  if (!isBrowser()) return;
  const payload: RememberedChickenDefaults = {
    visualIdType: normalizeVisualIdType(next.visualIdType),
    visualIdColor: normalizeOptionalString(next.visualIdColor),
    breedPrimary: normalizeOptionalString(next.breedPrimary),
    breedSecondary: normalizeNullableString(next.breedSecondary),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / privacy mode errors
  }
}


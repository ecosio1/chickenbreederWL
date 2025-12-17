"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";

interface ChickenFilterPresetValues {
  search: string;
  status: string;
  sex: string;
  breedPrimary: string;
  coopLocationName: string;
}

interface ChickenFilterPreset {
  id: string;
  name: string;
  values: ChickenFilterPresetValues;
}

const PRESETS_STORAGE_KEY = "wclb.chickens.filterPresets.v1";

function safeParsePresets(raw: string | null): ChickenFilterPreset[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as ChickenFilterPreset[];
  } catch {
    return [];
  }
}

function createPresetId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

export function ChickenFilters() {
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [status, setStatus] = useQueryState("status", { defaultValue: "" });
  const [sex, setSex] = useQueryState("sex", { defaultValue: "" });
  const [breedPrimary, setBreedPrimary] = useQueryState("breed_primary", { defaultValue: "" });
  const [coopLocationName, setCoopLocationName] = useQueryState("coop_location_name", { defaultValue: "" });

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [presets, setPresets] = useState<ChickenFilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const currentValues = useMemo<ChickenFilterPresetValues>(
    () => ({
      search,
      status,
      sex,
      breedPrimary,
      coopLocationName,
    }),
    [breedPrimary, coopLocationName, search, sex, status],
  );

  useEffect(() => {
    setPresets(safeParsePresets(window.localStorage.getItem(PRESETS_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  function clearAll() {
    void setSearch("");
    void setStatus("");
    void setSex("");
    void setBreedPrimary("");
    void setCoopLocationName("");
  }

  function applyPreset(preset: ChickenFilterPreset) {
    void setSearch(preset.values.search);
    void setStatus(preset.values.status);
    void setSex(preset.values.sex);
    void setBreedPrimary(preset.values.breedPrimary);
    void setCoopLocationName(preset.values.coopLocationName);
  }

  function savePreset() {
    const name = window.prompt("Preset name:", "");
    if (!name) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const preset: ChickenFilterPreset = { id: createPresetId(), name: trimmed, values: currentValues };
    setPresets((prev) => [preset, ...prev]);
    setSelectedPresetId(preset.id);
  }

  function deleteSelectedPreset() {
    if (!selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    const ok = window.confirm(`Delete preset “${preset.name}”?`);
    if (!ok) return;
    setPresets((prev) => prev.filter((p) => p.id !== selectedPresetId));
    setSelectedPresetId("");
  }

  return (
    <div className="space-y-2">
      <div className="sticky top-3 z-20 rounded-lg border border-black/10 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-1">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Unique code or Visual ID number…"
              value={search}
              onChange={(e) => void setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[240px_auto_auto_auto] md:items-end">
            <div className="space-y-1">
              <Label htmlFor="preset">Saved presets</Label>
              <Select
                id="preset"
                value={selectedPresetId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPresetId(id);
                  const preset = presets.find((p) => p.id === id);
                  if (preset) applyPreset(preset);
                }}
              >
                <option value="">—</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <Button type="button" variant="secondary" onClick={savePreset}>
              Save preset
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              Clear
            </Button>
            <Button type="button" className="md:hidden" variant="ghost" onClick={() => setIsFiltersOpen((v) => !v)}>
              {isFiltersOpen ? "Hide filters" : "Show filters"}
            </Button>
          </div>
        </div>

        {selectedPresetId ? (
          <div className="mt-2 flex justify-end">
            <Button type="button" variant="ghost" onClick={deleteSelectedPreset}>
              Delete selected preset
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden rounded-lg border border-black/10 bg-white p-4 md:block">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => void setStatus(e.target.value)}>
              <option value="">Any</option>
              <option value="alive">Alive</option>
              <option value="sold">Sold</option>
              <option value="deceased">Deceased</option>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sex">Sex</Label>
            <Select id="sex" value={sex} onChange={(e) => void setSex(e.target.value)}>
              <option value="">Any</option>
              <option value="hen">Hen</option>
              <option value="rooster">Rooster</option>
              <option value="unknown">Unknown</option>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="breed_primary">Breed</Label>
            <Input
              id="breed_primary"
              placeholder="e.g., Plymouth Rock"
              value={breedPrimary}
              onChange={(e) => void setBreedPrimary(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="coop_location_name">Coop / Location</Label>
            <Input
              id="coop_location_name"
              placeholder="e.g., Breeder Pen 1"
              value={coopLocationName}
              onChange={(e) => void setCoopLocationName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isFiltersOpen ? (
        <div className="rounded-lg border border-black/10 bg-white p-4 md:hidden">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <Label htmlFor="status_m">Status</Label>
              <Select id="status_m" value={status} onChange={(e) => void setStatus(e.target.value)}>
                <option value="">Any</option>
                <option value="alive">Alive</option>
                <option value="sold">Sold</option>
                <option value="deceased">Deceased</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sex_m">Sex</Label>
              <Select id="sex_m" value={sex} onChange={(e) => void setSex(e.target.value)}>
                <option value="">Any</option>
                <option value="hen">Hen</option>
                <option value="rooster">Rooster</option>
                <option value="unknown">Unknown</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="breed_primary_m">Breed</Label>
              <Input
                id="breed_primary_m"
                placeholder="e.g., Plymouth Rock"
                value={breedPrimary}
                onChange={(e) => void setBreedPrimary(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="coop_location_name_m">Coop / Location</Label>
              <Input
                id="coop_location_name_m"
                placeholder="e.g., Breeder Pen 1"
                value={coopLocationName}
                onChange={(e) => void setCoopLocationName(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



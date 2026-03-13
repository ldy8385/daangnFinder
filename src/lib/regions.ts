import regionsData from "@/data/regions.json";
import { RegionEntry } from "./types";

const regions: RegionEntry[] = regionsData as RegionEntry[];

export function searchRegions(query: string, limit = 10): RegionEntry[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return regions
    .filter(
      (r) =>
        r.depth1.toLowerCase().includes(q) ||
        r.depth2.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export function getAllRegions(): RegionEntry[] {
  return regions;
}

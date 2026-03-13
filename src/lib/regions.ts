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
    .sort((a, b) => {
      // city-level results first
      if (a.level === "city" && b.level !== "city") return -1;
      if (a.level !== "city" && b.level === "city") return 1;
      return 0;
    })
    .slice(0, limit);
}

export function getDistrictsByCity(cityName: string): RegionEntry[] {
  return regions.filter((r) => r.level === "district" && r.depth1 === cityName);
}

export function getAllRegions(): RegionEntry[] {
  return regions;
}

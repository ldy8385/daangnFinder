import { describe, it, expect } from "vitest";
import { searchRegions } from "@/lib/regions";

describe("searchRegions", () => {
  it("returns matching regions for partial query", () => {
    const results = searchRegions("강남");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].depth2).toContain("강남");
  });

  it("returns empty for empty query", () => {
    expect(searchRegions("")).toEqual([]);
  });

  it("limits results", () => {
    const results = searchRegions("서울", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

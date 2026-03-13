import { describe, it, expect } from "vitest";
import { parseArticles, parseSiblingRegions } from "@/lib/daangn-parser";

const sampleData = {
  allPage: {
    fleamarketArticles: [
      {
        id: "/kr/buy-sell/test-1/",
        title: "아이폰 15",
        price: "800000.0",
        thumbnail: "https://img.example.com/thumb.webp",
        status: "Ongoing",
        createdAt: "2026-03-10T12:00:00Z",
        href: "https://www.daangn.com/kr/buy-sell/test-1/",
        region: { name: "역삼동" },
      },
      {
        id: "/kr/buy-sell/test-2/",
        title: "갤럭시 S25",
        price: "600000.0",
        thumbnail: "https://img.example.com/thumb2.webp",
        status: "Closed",
        createdAt: "2026-03-09T10:00:00Z",
        href: "https://www.daangn.com/kr/buy-sell/test-2/",
        region: { name: "대치동" },
      },
    ],
  },
  regionFilterOptions: {
    siblingRegions: [
      { id: 6035, name: "역삼동", name3Id: 6035, name3: "역삼동" },
      { id: 6032, name: "대치동", name3Id: 6032, name3: "대치동" },
      { id: 386, name: "청담동", name3Id: 386, name3: "청담동" },
    ],
  },
};

describe("parseArticles", () => {
  it("extracts articles from route data", () => {
    const articles = parseArticles(sampleData);
    expect(articles).toHaveLength(2);
    const a = articles[0];
    expect(a).toHaveProperty("id");
    expect(a).toHaveProperty("title");
    expect(a).toHaveProperty("price");
    expect(a).toHaveProperty("thumbnail");
    expect(a).toHaveProperty("status");
    expect(a).toHaveProperty("region");
    expect(a).toHaveProperty("createdAt");
    expect(a).toHaveProperty("href");
    expect(typeof a.price).toBe("number");
    expect(a.price).toBe(800000);
    expect(a.region).toBe("역삼동");
  });

  it("returns empty array for missing data", () => {
    expect(parseArticles({})).toEqual([]);
    expect(parseArticles({ allPage: {} })).toEqual([]);
    expect(parseArticles({ allPage: { fleamarketArticles: null } })).toEqual([]);
  });
});

describe("parseSiblingRegions", () => {
  it("extracts sibling regions from route data", () => {
    const regions = parseSiblingRegions(sampleData);
    expect(regions).toHaveLength(3);
    expect(regions[0]).toEqual({ id: 6035, name: "역삼동" });
    expect(regions[1]).toEqual({ id: 6032, name: "대치동" });
  });

  it("returns empty array for missing data", () => {
    expect(parseSiblingRegions({})).toEqual([]);
    expect(parseSiblingRegions({ regionFilterOptions: {} })).toEqual([]);
  });
});

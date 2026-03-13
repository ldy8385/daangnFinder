import { describe, it, expect } from "vitest";
import { deduplicateArticles, sortArticles } from "@/lib/daangn-fetcher";
import { Article } from "@/lib/types";

const mockArticles: Article[] = [
  { id: "1", title: "Item A", price: 500, thumbnail: "", status: "Ongoing", region: "역삼동", createdAt: "2026-03-10T10:00:00+09:00", href: "/a" },
  { id: "2", title: "Item B", price: 300, thumbnail: "", status: "Ongoing", region: "서초동", createdAt: "2026-03-11T10:00:00+09:00", href: "/b" },
  { id: "1", title: "Item A dup", price: 500, thumbnail: "", status: "Ongoing", region: "역삼동", createdAt: "2026-03-10T10:00:00+09:00", href: "/a" },
  { id: "3", title: "Item C", price: 800, thumbnail: "", status: "Ongoing", region: "반포동", createdAt: "2026-03-09T10:00:00+09:00", href: "/c" },
];

describe("deduplicateArticles", () => {
  it("removes duplicates by id", () => {
    const result = deduplicateArticles(mockArticles);
    expect(result).toHaveLength(3);
    const ids = result.map((a) => a.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe("sortArticles", () => {
  it("sorts by recent (newest first)", () => {
    const sorted = sortArticles(mockArticles, "recent");
    expect(sorted[0].id).toBe("2");
  });

  it("sorts by price ascending", () => {
    const sorted = sortArticles(mockArticles, "price_asc");
    expect(sorted[0].price).toBe(300);
  });

  it("sorts by price descending", () => {
    const sorted = sortArticles(mockArticles, "price_desc");
    expect(sorted[0].price).toBe(800);
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseArticles, parseSiblingRegions } from "@/lib/daangn-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = readFileSync(
  path.join(__dirname, "../fixtures/daangn-sample.html"),
  "utf-8"
);

describe("parseArticles", () => {
  it("extracts articles from HTML", () => {
    const articles = parseArticles(html);
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
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
  });
});

describe("parseSiblingRegions", () => {
  it("extracts sibling regions from HTML", () => {
    const regions = parseSiblingRegions(html);
    expect(Array.isArray(regions)).toBe(true);
    // siblingRegions MUST be extracted — validates parser key paths
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0]).toHaveProperty("id");
    expect(regions[0]).toHaveProperty("name");
    expect(typeof regions[0].id).toBe("number");
  });
});

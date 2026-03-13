# daangnFinder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시/구 단위로 당근마켓 중고거래를 검색하는 Next.js 웹앱

**Architecture:** Next.js App Router로 프론트엔드 + API Route(CORS 프록시). API Route가 당근마켓 SSR 페이지를 fetch → cheerio로 `window.__remixContext` 파싱 → 구 내 모든 동 병렬 검색 → 결과 합산 반환.

**Tech Stack:** Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, cheerio

---

## File Structure

```
daangnFinder/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout + AdSense script
│   │   ├── page.tsx                # Main search page
│   │   ├── globals.css             # Tailwind imports
│   │   └── api/
│   │       ├── regions/route.ts    # GET /api/regions?q=
│   │       └── search/route.ts     # GET /api/search
│   ├── lib/
│   │   ├── types.ts                # Shared types (Article, Region, etc.)
│   │   ├── regions.ts              # Region data loader + search
│   │   ├── daangn-parser.ts        # HTML → remixContext → articles 파싱
│   │   ├── daangn-fetcher.ts       # Fetch orchestration (chunk, timeout, dedup)
│   │   └── rate-limit.ts           # Simple IP-based rate limiter
│   ├── components/
│   │   ├── SearchBar.tsx           # 지역 자동완성 + 검색어 + 버튼
│   │   ├── ArticleCard.tsx         # 단일 상품 카드
│   │   ├── ArticleGrid.tsx         # 결과 그리드 + 빈 상태/로딩
│   │   └── SortFilter.tsx          # 거래가능 토글 + 정렬 드롭다운
│   └── data/
│       └── regions.json            # 시/구 → 대표동ID 정적 매핑
├── __tests__/
│   ├── lib/
│   │   ├── daangn-parser.test.ts
│   │   ├── regions.test.ts
│   │   └── daangn-fetcher.test.ts
│   └── fixtures/
│       └── daangn-sample.html      # 실제 당근 응답 HTML 샘플
```

---

## Chunk 1: Project Scaffolding + Core Types

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js with TypeScript + Tailwind**

```bash
cd /Users/dong/workspace/daangnFinder
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Choose defaults: no Turbopack needed.

- [ ] **Step 2: Install dependencies**

```bash
npm install cheerio
npm install -D @types/node vitest
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML output from Next.js default page.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with TypeScript + Tailwind"
```

---

### Task 2: Define Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/types.ts

export interface Article {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  status: "Ongoing" | "Closed" | "Reserved";
  region: string;
  createdAt: string;
  href: string;
}

export interface RegionEntry {
  name: string;       // "서울특별시 강남구"
  depth1: string;     // "서울특별시"
  depth2: string;     // "강남구"
  representativeId: number;
  representativeName: string;
}

export interface SiblingRegion {
  id: number;
  name: string;
}

export interface SearchResult {
  articles: Article[];
  resultCount: number;
  regionCount: number;
}

export type SortType = "recent" | "price_asc" | "price_desc";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Chunk 2: Region Data + Parser

### Task 3: Collect Region Data & Build Static JSON

**Files:**
- Create: `src/data/regions.json`
- Create: `src/lib/regions.ts`
- Create: `__tests__/lib/regions.test.ts`

- [ ] **Step 1: Create initial regions.json with major cities**

주요 시/구의 대표 동 ID를 수집하여 정적 JSON 생성. 먼저 당근마켓에서 실제 데이터를 가져와서 확인한다.

서울 주요 구부터 시작 — 각 구의 대표 동 하나의 페이지를 fetch하여 `regionFilterOptions.parentRegion`과 `siblingRegions`를 확인, 대표 동 ID 매핑 구축.

```json
[
  { "name": "서울특별시 강남구", "depth1": "서울특별시", "depth2": "강남구", "representativeId": 958, "representativeName": "역삼동" },
  { "name": "서울특별시 서초구", "depth1": "서울특별시", "depth2": "서초구", "representativeId": 6128, "representativeName": "서초동" }
]
```

**NOTE:** 전체 지역 데이터는 별도 스크립트로 수집하는 것이 현실적. 초기에는 서울 25개 구 + 주요 광역시 구를 수동 수집하여 시작. 이후 확장.

- [ ] **Step 2: Create region search utility**

```typescript
// src/lib/regions.ts
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
```

- [ ] **Step 3: Write test for region search**

```typescript
// __tests__/lib/regions.test.ts
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
```

- [ ] **Step 4: Add vitest config and run tests**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/regions.json src/lib/regions.ts __tests__/lib/regions.test.ts vitest.config.ts package.json
git commit -m "feat: add region data and search utility"
```

---

### Task 4: Daangn HTML Parser

**Files:**
- Create: `src/lib/daangn-parser.ts`
- Create: `__tests__/lib/daangn-parser.test.ts`
- Create: `__tests__/fixtures/daangn-sample.html`

- [ ] **Step 1: Capture a real HTML fixture**

실제 당근마켓 검색 페이지를 하나 저장:

```bash
curl -s "https://www.daangn.com/kr/buy-sell/s/?in=%EC%84%9C%EC%B4%88%EB%8F%99-6128&search=%EC%95%84%EC%9D%B4%ED%8F%B0&only_on_sale=true" > __tests__/fixtures/daangn-sample.html
```

- [ ] **Step 2: Write parser test**

```typescript
// __tests__/lib/daangn-parser.test.ts
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
    // 결과가 있을 수도 없을 수도 있으므로 배열인지만 확인
    expect(Array.isArray(articles)).toBe(true);
    if (articles.length > 0) {
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
    }
  });
});

describe("parseSiblingRegions", () => {
  it("extracts sibling regions from HTML", () => {
    const regions = parseSiblingRegions(html);
    expect(Array.isArray(regions)).toBe(true);
    // 반드시 siblingRegions가 추출되어야 함 — 파서 키 경로 검증
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0]).toHaveProperty("id");
    expect(regions[0]).toHaveProperty("name");
    expect(typeof regions[0].id).toBe("number");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- __tests__/lib/daangn-parser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement parser**

```typescript
// src/lib/daangn-parser.ts
import * as cheerio from "cheerio";
import { Article, SiblingRegion } from "./types";

function extractRemixContext(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  let context: Record<string, unknown> | null = null;

  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("window.__remixContext")) {
      // Extract JSON from: window.__remixContext = {...};
      const match = text.match(
        /window\.__remixContext\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/
      );
      if (match) {
        try {
          context = JSON.parse(match[1]);
        } catch {
          // Try a more lenient extraction
          const jsonStart = text.indexOf("{");
          const jsonEnd = text.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            try {
              context = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
            } catch {
              // give up
            }
          }
        }
      }
    }
  });

  return context;
}

function findLoaderData(context: Record<string, unknown>): Record<string, unknown> | null {
  // Navigate through remixContext to find loaderData
  // Structure varies, so search recursively for fleamarketArticles
  const str = JSON.stringify(context);
  if (!str.includes("fleamarketArticles")) return null;

  function findKey(obj: unknown, key: string): unknown {
    if (obj === null || typeof obj !== "object") return null;
    const record = obj as Record<string, unknown>;
    if (key in record) return record[key];
    for (const v of Object.values(record)) {
      const found = findKey(v, key);
      if (found !== null) return found;
    }
    return null;
  }

  const articles = findKey(context, "fleamarketArticles");
  const regionFilter = findKey(context, "regionFilterOptions");
  return { fleamarketArticles: articles, regionFilterOptions: regionFilter };
}

export function parseArticles(html: string): Article[] {
  const context = extractRemixContext(html);
  if (!context) return [];

  const loaderData = findLoaderData(context);
  if (!loaderData) return [];

  const raw = loaderData.fleamarketArticles;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: Record<string, unknown>): Article | null => {
      try {
        const regionObj = item.region as Record<string, unknown> | undefined;
        return {
          id: String(item.id || ""),
          title: String(item.title || ""),
          price: Math.floor(parseFloat(String(item.price || "0"))),
          thumbnail: String(item.thumbnail || ""),
          status: String(item.status || "Ongoing") as Article["status"],
          region: regionObj?.name ? String(regionObj.name) : "",
          createdAt: String(item.createdAt || ""),
          href: String(item.href || ""),
        };
      } catch {
        return null;
      }
    })
    .filter((a): a is Article => a !== null && a.id !== "");
}

export function parseSiblingRegions(html: string): SiblingRegion[] {
  const context = extractRemixContext(html);
  if (!context) return [];

  const loaderData = findLoaderData(context);
  if (!loaderData) return [];

  const regionFilter = loaderData.regionFilterOptions as Record<string, unknown> | undefined;
  if (!regionFilter) return [];

  const siblings = regionFilter.siblingRegions;
  if (!Array.isArray(siblings)) return [];

  return siblings
    .map((r: Record<string, unknown>): SiblingRegion | null => {
      const id = Number(r.dbId || r.id);
      const name = String(r.name || r.name3 || "");
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((r): r is SiblingRegion => r !== null);
}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/daangn-parser.ts __tests__/lib/daangn-parser.test.ts __tests__/fixtures/
git commit -m "feat: add daangn HTML parser with cheerio"
```

---

## Chunk 3: Fetch Orchestration + API Routes

### Task 5: Daangn Fetcher (Chunk + Timeout + Dedup)

**Files:**
- Create: `src/lib/daangn-fetcher.ts`
- Create: `__tests__/lib/daangn-fetcher.test.ts`

- [ ] **Step 1: Write fetcher test**

```typescript
// __tests__/lib/daangn-fetcher.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/daangn-fetcher.test.ts
```

- [ ] **Step 3: Implement fetcher**

```typescript
// src/lib/daangn-fetcher.ts
import { parseArticles, parseSiblingRegions } from "./daangn-parser";
import { Article, SiblingRegion, SortType } from "./types";

const DAANGN_BASE = "https://www.daangn.com/kr/buy-sell/s/";
const CHUNK_SIZE = 10;
const REQUEST_TIMEOUT = 5000;
const CHUNK_DELAY = 100;

function buildDaangnUrl(regionName: string, regionId: number, search: string, onlyOnSale: boolean): string {
  const params = new URLSearchParams({
    in: `${regionName}-${regionId}`,
    search,
  });
  if (onlyOnSale) params.set("only_on_sale", "true");
  return `${DAANGN_BASE}?${params.toString()}`;
}

async function fetchWithTimeout(url: string, timeout: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function deduplicateArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function sortArticles(articles: Article[], sort: SortType): Article[] {
  const sorted = [...articles];
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted;
  }
}

async function fetchChunk(regions: SiblingRegion[], search: string, onlyOnSale: boolean): Promise<Article[]> {
  const results = await Promise.allSettled(
    regions.map(async (region) => {
      const url = buildDaangnUrl(region.name, region.id, search, onlyOnSale);
      const html = await fetchWithTimeout(url, REQUEST_TIMEOUT);
      return parseArticles(html);
    })
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchDaangn(
  regionName: string,
  regionId: number,
  search: string,
  onlyOnSale: boolean,
  sort: SortType
): Promise<{ articles: Article[]; regionCount: number }> {
  // Step 1: Fetch representative region to get siblingRegions
  const firstUrl = buildDaangnUrl(regionName, regionId, search, onlyOnSale);
  const firstHtml = await fetchWithTimeout(firstUrl, REQUEST_TIMEOUT);
  const siblingRegions = parseSiblingRegions(firstHtml);
  const firstArticles = parseArticles(firstHtml);

  // siblingRegions가 5개 미만이면 신뢰할 수 없으므로 대표 동 결과만 반환
  // NOTE: 향후 정적 JSON에 구별 동 목록을 추가하여 폴백 가능
  if (siblingRegions.length < 5) {
    return {
      articles: sortArticles(firstArticles, sort),
      regionCount: 1,
    };
  }

  // Step 2: Filter out the representative region (already fetched)
  const remainingRegions = siblingRegions.filter((r) => r.id !== regionId);

  // Step 3: Fetch remaining regions in chunks
  let allArticles = [...firstArticles];

  for (let i = 0; i < remainingRegions.length; i += CHUNK_SIZE) {
    const chunk = remainingRegions.slice(i, i + CHUNK_SIZE);
    const chunkArticles = await fetchChunk(chunk, search, onlyOnSale);
    allArticles = allArticles.concat(chunkArticles);

    if (i + CHUNK_SIZE < remainingRegions.length) {
      await sleep(CHUNK_DELAY);
    }
  }

  // Step 4: Deduplicate and sort
  const deduplicated = deduplicateArticles(allArticles);
  const sorted = sortArticles(deduplicated, sort);

  return {
    articles: sorted,
    regionCount: siblingRegions.length,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/daangn-fetcher.ts __tests__/lib/daangn-fetcher.test.ts
git commit -m "feat: add daangn fetcher with chunk, timeout, dedup, sort"
```

---

### Task 6: Rate Limiter

**Files:**
- Create: `src/lib/rate-limit.ts`

- [ ] **Step 1: Create simple in-memory rate limiter**

```typescript
// src/lib/rate-limit.ts
// NOTE: In-memory only — resets between Vercel serverless invocations.
// Provides basic protection during dev and burst protection in production.
// For persistent rate limiting, migrate to Upstash Redis or Vercel KV.
const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requests.get(ip) || [];

  // Remove old timestamps
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    requests.set(ip, recent);
    return true;
  }

  recent.push(now);
  requests.set(ip, recent);
  return false;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add in-memory rate limiter"
```

---

### Task 7: API Route — /api/regions

**Files:**
- Create: `src/app/api/regions/route.ts`

- [ ] **Step 1: Implement regions API route**

```typescript
// src/app/api/regions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchRegions } from "@/lib/regions";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const results = searchRegions(q);
  return NextResponse.json(results);
}
```

- [ ] **Step 2: Test manually**

```bash
npm run dev &
sleep 3
curl -s "http://localhost:3000/api/regions?q=강남" | head -50
kill %1
```

Expected: JSON array of matching regions.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/regions/route.ts
git commit -m "feat: add /api/regions endpoint"
```

---

### Task 8: API Route — /api/search

**Files:**
- Create: `src/app/api/search/route.ts`

- [ ] **Step 1: Implement search API route**

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchDaangn } from "@/lib/daangn-fetcher";
import { isRateLimited } from "@/lib/rate-limit";
import { SortType } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Rate limit check
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const params = request.nextUrl.searchParams;
  const regionName = params.get("regionName");
  const regionId = params.get("regionId");
  const search = params.get("search");
  const onlyOnSale = params.get("onlyOnSale") !== "false";
  const sort = (params.get("sort") || "recent") as SortType;

  if (!regionName || !regionId || !search) {
    return NextResponse.json(
      { error: "Missing required parameters: regionName, regionId, search" },
      { status: 400 }
    );
  }

  try {
    const result = await searchDaangn(
      regionName,
      parseInt(regionId, 10),
      search,
      onlyOnSale,
      sort
    );

    return NextResponse.json({
      articles: result.articles,
      resultCount: result.articles.length,
      regionCount: result.regionCount,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test manually with real data**

```bash
npm run dev &
sleep 3
curl -s "http://localhost:3000/api/search?regionName=%EC%84%9C%EC%B4%88%EB%8F%99&regionId=6128&search=%EC%95%84%EC%9D%B4%ED%8F%B0" | python3 -m json.tool | head -40
kill %1
```

Expected: JSON with articles array and resultCount.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "feat: add /api/search endpoint with rate limiting"
```

---

## Chunk 4: Frontend Components

### Task 9: SearchBar Component (with Region Autocomplete)

**Files:**
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar with autocomplete**

```tsx
// src/components/SearchBar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { RegionEntry } from "@/lib/types";

interface SearchBarProps {
  onSearch: (region: RegionEntry, query: string) => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [regionQuery, setRegionQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<RegionEntry[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionQuery.length < 1 || selectedRegion) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/regions?q=${encodeURIComponent(regionQuery)}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [regionQuery, selectedRegion]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRegion = (region: RegionEntry) => {
    setSelectedRegion(region);
    setRegionQuery(region.name);
    setShowSuggestions(false);
  };

  const handleRegionInputChange = (value: string) => {
    setRegionQuery(value);
    setSelectedRegion(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRegion && searchQuery.trim()) {
      onSearch(selectedRegion, searchQuery.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="relative flex-1" ref={suggestionsRef}>
        <input
          type="text"
          value={regionQuery}
          onChange={(e) => handleRegionInputChange(e.target.value)}
          placeholder="지역 검색 (예: 강남구)"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((region) => (
              <button
                key={`${region.depth1}-${region.depth2}`}
                type="button"
                onClick={() => handleSelectRegion(region)}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 text-gray-900 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium">{region.depth2}</span>
                <span className="text-gray-500 text-sm ml-2">{region.depth1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="검색어 입력"
        className="flex-[1.5] px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
      />
      <button
        type="submit"
        disabled={!selectedRegion || !searchQuery.trim() || isLoading}
        className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {isLoading ? "검색 중..." : "검색"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SearchBar.tsx
git commit -m "feat: add SearchBar with region autocomplete"
```

---

### Task 10: SortFilter Component

**Files:**
- Create: `src/components/SortFilter.tsx`

- [ ] **Step 1: Create SortFilter**

```tsx
// src/components/SortFilter.tsx
"use client";

import { SortType } from "@/lib/types";

interface SortFilterProps {
  onlyOnSale: boolean;
  sort: SortType;
  resultCount: number;
  regionCount: number;
  onOnlyOnSaleChange: (value: boolean) => void;
  onSortChange: (value: SortType) => void;
}

export default function SortFilter({
  onlyOnSale,
  sort,
  resultCount,
  regionCount,
  onOnlyOnSaleChange,
  onSortChange,
}: SortFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onOnlyOnSaleChange(!onlyOnSale)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            onlyOnSale
              ? "bg-orange-500 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          거래가능만
        </button>
        <span className="text-sm text-gray-500">
          {regionCount}개 동에서 {resultCount}개 결과
        </span>
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortType)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white text-gray-900"
      >
        <option value="recent">최신순</option>
        <option value="price_asc">가격 낮은순</option>
        <option value="price_desc">가격 높은순</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SortFilter.tsx
git commit -m "feat: add SortFilter component"
```

---

### Task 11: ArticleCard + ArticleGrid Components

**Files:**
- Create: `src/components/ArticleCard.tsx`
- Create: `src/components/ArticleGrid.tsx`

- [ ] **Step 1: Create ArticleCard**

```tsx
// src/components/ArticleCard.tsx
import { Article } from "@/lib/types";

interface ArticleCardProps {
  article: Article;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return `${Math.floor(diffDay / 30)}달 전`;
}

function formatPrice(price: number): string {
  if (price === 0) return "나눔";
  return price.toLocaleString("ko-KR") + "원";
}

const statusBadge: Record<string, { text: string; className: string }> = {
  Reserved: { text: "예약중", className: "bg-green-100 text-green-700" },
  Closed: { text: "판매완료", className: "bg-gray-100 text-gray-500" },
};

export default function ArticleCard({ article }: ArticleCardProps) {
  const badge = statusBadge[article.status];

  return (
    <a
      href={`https://www.daangn.com${article.href}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
    >
      <div className="relative aspect-square bg-gray-100">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            이미지 없음
          </div>
        )}
        {badge && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug">
          {article.title}
        </h3>
        <p className="text-orange-600 font-bold mt-1">
          {formatPrice(article.price)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {article.region} · {timeAgo(article.createdAt)}
        </p>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Create ArticleGrid**

```tsx
// src/components/ArticleGrid.tsx
import { Article } from "@/lib/types";
import ArticleCard from "./ArticleCard";

interface ArticleGridProps {
  articles: Article[];
  isLoading: boolean;
  hasSearched: boolean;
}

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function ArticleGrid({ articles, isLoading, hasSearched }: ArticleGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (hasSearched && articles.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">검색 결과가 없습니다</p>
        <p className="text-sm mt-2">다른 검색어나 지역으로 시도해보세요</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">지역과 검색어를 입력해주세요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ArticleCard.tsx src/components/ArticleGrid.tsx
git commit -m "feat: add ArticleCard and ArticleGrid components"
```

---

## Chunk 5: Main Page Assembly + Polish

### Task 12: Main Page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update globals.css** — keep only Tailwind directives

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Implement main page**

```tsx
// src/app/page.tsx
"use client";

import { useState, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import SortFilter from "@/components/SortFilter";
import ArticleGrid from "@/components/ArticleGrid";
import { Article, RegionEntry, SortType, SearchResult } from "@/lib/types";

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [onlyOnSale, setOnlyOnSale] = useState(true);
  const [sort, setSort] = useState<SortType>("recent");
  const [resultCount, setResultCount] = useState(0);
  const [regionCount, setRegionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Store last search params for re-search on filter change
  const [lastRegion, setLastRegion] = useState<RegionEntry | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const doSearch = useCallback(
    async (region: RegionEntry, query: string, sale: boolean, sortBy: SortType) => {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          regionName: region.representativeName,
          regionId: String(region.representativeId),
          search: query,
          onlyOnSale: String(sale),
          sort: sortBy,
        });

        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "검색에 실패했습니다");
        }

        const data: SearchResult = await res.json();
        setArticles(data.articles);
        setResultCount(data.resultCount);
        setRegionCount(data.regionCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "검색에 실패했습니다");
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSearch = (region: RegionEntry, query: string) => {
    setLastRegion(region);
    setLastQuery(query);
    doSearch(region, query, onlyOnSale, sort);
  };

  const handleOnlyOnSaleChange = (value: boolean) => {
    setOnlyOnSale(value);
    if (lastRegion && lastQuery) {
      doSearch(lastRegion, lastQuery, value, sort);
    }
  };

  const handleSortChange = (value: SortType) => {
    setSort(value);
    if (lastRegion && lastQuery) {
      doSearch(lastRegion, lastQuery, onlyOnSale, value);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🥕 daangnFinder
          </h1>
          <p className="text-gray-500 mt-2">
            시/구 단위로 당근마켓 중고거래를 한번에 검색
          </p>
        </header>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {hasSearched && (
          <SortFilter
            onlyOnSale={onlyOnSale}
            sort={sort}
            resultCount={resultCount}
            regionCount={regionCount}
            onOnlyOnSaleChange={handleOnlyOnSaleChange}
            onSortChange={handleSortChange}
          />
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => lastRegion && lastQuery && doSearch(lastRegion, lastQuery, onlyOnSale, sort)}
              className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              다시 시도
            </button>
          </div>
        )}

        {!error && (
          <ArticleGrid
            articles={articles}
            isLoading={isLoading}
            hasSearched={hasSearched}
          />
        )}

        <footer className="text-center text-xs text-gray-400 mt-12 py-4">
          <p>각 동의 최근 게시글 기준으로 검색됩니다</p>
        </footer>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update layout.tsx for metadata**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "daangnFinder - 당근마켓 지역 통합 검색",
  description: "시/구 단위로 당근마켓 중고거래를 한번에 검색하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify full app works**

```bash
npm run dev &
sleep 3
# Open http://localhost:3000 in browser
# Test: 서초구 + 아이폰 검색
```

Expected: Search results grid with article cards.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: assemble main search page"
```

---

### Task 13: Region Data Collection Script

지역 데이터를 수동으로 하나씩 넣기보다, 스크립트로 주요 시/구의 대표 동 ID를 수집한다.

**Files:**
- Create: `scripts/collect-regions.ts`
- Update: `src/data/regions.json`

- [ ] **Step 1: Create collection script**

```typescript
// scripts/collect-regions.ts
// Usage: npx tsx scripts/collect-regions.ts
//
// 주요 도시의 알려진 동 하나를 시작점으로,
// 당근마켓 페이지에서 siblingRegions + parentRegion 정보를 수집하여
// regions.json을 빌드한다.

import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 시작점: 각 시/도의 알려진 동 하나
const SEED_REGIONS = [
  // 서울
  { name: "역삼동", id: 958 },
  { name: "서초동", id: 6128 },
  { name: "잠실동", id: 6226 },
  { name: "마포동", id: 6068 },
  { name: "종로1·2·3·4가동", id: 805 },
  // ... 추가 시드는 실행하면서 확장
];

interface CollectedRegion {
  name: string;
  depth1: string;
  depth2: string;
  representativeId: number;
  representativeName: string;
}

async function fetchRegionInfo(regionName: string, regionId: number) {
  const url = `https://www.daangn.com/kr/buy-sell/s/?in=${encodeURIComponent(regionName)}-${regionId}&search=test`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  let context: Record<string, unknown> | null = null;
  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("window.__remixContext")) {
      const match = text.match(/window\.__remixContext\s*=\s*(\{[\s\S]*?\});?\s*$/m);
      if (match) {
        try { context = JSON.parse(match[1]); } catch {}
      }
    }
  });

  return context;
}

// Run collection and save to regions.json
async function main() {
  const collected = new Map<string, CollectedRegion>();

  for (const seed of SEED_REGIONS) {
    console.log(`Fetching ${seed.name} (${seed.id})...`);
    try {
      const context = await fetchRegionInfo(seed.name, seed.id);
      if (!context) continue;

      // Extract region info from context (navigate loaderData)
      const str = JSON.stringify(context);
      // Parse out depth1RegionName, depth2RegionName, siblingRegions, etc.
      // This is a best-effort extraction
      const depth1Match = str.match(/"depth1RegionName"\s*:\s*"([^"]+)"/);
      const depth2Match = str.match(/"depth2RegionName"\s*:\s*"([^"]+)"/);

      if (depth1Match && depth2Match) {
        const key = `${depth1Match[1]}-${depth2Match[1]}`;
        if (!collected.has(key)) {
          collected.set(key, {
            name: `${depth1Match[1]} ${depth2Match[1]}`,
            depth1: depth1Match[1],
            depth2: depth2Match[1],
            representativeId: seed.id,
            representativeName: seed.name,
          });
          console.log(`  → ${key}`);
        }
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`  Error: ${e}`);
    }
  }

  const result = Array.from(collected.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ko")
  );

  const outPath = path.join(__dirname, "../src/data/regions.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved ${result.length} regions to ${outPath}`);
}

main();
```

- [ ] **Step 2: Run script and collect initial data**

```bash
npx tsx scripts/collect-regions.ts
```

Review output, then manually add more seed regions as needed to expand coverage.

- [ ] **Step 3: Commit collected data**

```bash
git add scripts/collect-regions.ts src/data/regions.json
git commit -m "feat: add region collection script and initial data"
```

---

### Task 14: Next.js Image Config + Final Polish

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Configure image domains**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.kr.gcp-karroter.net",
      },
    ],
  },
};

export default nextConfig;
```

Note: ArticleCard uses `<img>` (not `next/image`) for simplicity since thumbnails are external. This config is for future use if switching to `next/image`.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: configure next.config for image domains"
```

---

### Task 15: AdSense Placeholder

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add AdSense script placeholder in layout**

Add to `<head>` in layout.tsx:

```tsx
<head>
  {/* Google AdSense - replace ca-pub-XXXXXXX with your publisher ID */}
  {process.env.NEXT_PUBLIC_ADSENSE_ID && (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
      crossOrigin="anonymous"
    />
  )}
</head>
```

- [ ] **Step 2: Add .env.example**

```bash
# .env.example
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX
```

- [ ] **Step 3: Add .env* to .gitignore**

```bash
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx .env.example .gitignore
git commit -m "feat: add AdSense placeholder configuration"
```

---

### Task 16: End-to-End Smoke Test

- [ ] **Step 1: Start dev server and test full flow**

```bash
npm run dev
```

Open `http://localhost:3000` in browser and verify:
1. Type "강남" in region field → autocomplete suggestions appear
2. Select "서울특별시 강남구"
3. Type "아이폰" in search field
4. Click 검색
5. Loading skeleton appears
6. Results grid shows with article cards
7. Click "거래가능만" toggle → re-searches
8. Change sort to "가격 낮은순" → re-sorts
9. Click article card → opens daangn.com in new tab

- [ ] **Step 2: Production build test**

```bash
npm run build && npm start
```

Verify same flow works on production build at `http://localhost:3000`.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final polish and verification"
```

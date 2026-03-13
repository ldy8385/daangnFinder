import { parseArticles, parseSiblingRegions } from "./daangn-parser";
import { Article, SiblingRegion, SortType } from "./types";
import { getDistrictsByCity } from "./regions";

const DAANGN_BASE = "https://www.daangn.com/kr/buy-sell/s/";
const REMIX_DATA_PARAM = "&_data=routes%2Fkr.buy-sell.s";
const CHUNK_SIZE = 10;
const REQUEST_TIMEOUT = 10000;
const CHUNK_DELAY = 100;

function buildDaangnUrl(regionName: string, regionId: number, search: string, onlyOnSale: boolean): string {
  const params = new URLSearchParams({
    in: `${regionName}-${regionId}`,
    search,
  });
  if (onlyOnSale) params.set("only_on_sale", "true");
  return `${DAANGN_BASE}?${params.toString()}${REMIX_DATA_PARAM}`;
}

async function fetchRouteData(url: string, timeout: number): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Accept": "application/json",
      },
    });
    return await res.json();
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
      const data = await fetchRouteData(url, REQUEST_TIMEOUT);
      return parseArticles(data);
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
  const firstData = await fetchRouteData(firstUrl, REQUEST_TIMEOUT);
  const siblingRegions = parseSiblingRegions(firstData);
  const firstArticles = parseArticles(firstData);

  // siblingRegions가 5개 미만이면 신뢰할 수 없으므로 대표 동 결과만 반환
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

export async function searchDaangnCity(
  cityName: string,
  search: string,
  onlyOnSale: boolean,
  sort: SortType
): Promise<{ articles: Article[]; regionCount: number }> {
  const districts = getDistrictsByCity(cityName);
  if (districts.length === 0) {
    return { articles: [], regionCount: 0 };
  }

  // Step 1: Fetch all district representative dongs in parallel to collect siblingRegions
  const repRegions: SiblingRegion[] = districts.map((d) => ({
    id: d.representativeId,
    name: d.representativeName,
  }));

  const repResults = await Promise.allSettled(
    repRegions.map(async (region) => {
      const url = buildDaangnUrl(region.name, region.id, search, onlyOnSale);
      const data = await fetchRouteData(url, REQUEST_TIMEOUT);
      const articles = parseArticles(data);
      const siblings = parseSiblingRegions(data);
      return { articles, siblings, fetchedId: region.id };
    })
  );

  // Collect articles from representative dongs + all sibling region IDs
  let allArticles: Article[] = [];
  const fetchedIds = new Set<number>();

  for (const result of repResults) {
    if (result.status !== "fulfilled") continue;
    const { articles, fetchedId } = result.value;
    allArticles = allArticles.concat(articles);
    fetchedIds.add(fetchedId);
  }

  // Step 2: Determine remaining regions (siblings not yet fetched)
  const remainingRegions: SiblingRegion[] = [];
  const seenIds = new Set<number>(fetchedIds);

  for (const result of repResults) {
    if (result.status !== "fulfilled") continue;
    for (const s of result.value.siblings) {
      if (!seenIds.has(s.id)) {
        remainingRegions.push(s);
        seenIds.add(s.id);
      }
    }
  }

  // Step 3: Fetch remaining sibling regions in chunks
  for (let i = 0; i < remainingRegions.length; i += CHUNK_SIZE) {
    const chunk = remainingRegions.slice(i, i + CHUNK_SIZE);
    const chunkArticles = await fetchChunk(chunk, search, onlyOnSale);
    allArticles = allArticles.concat(chunkArticles);

    if (i + CHUNK_SIZE < remainingRegions.length) {
      await sleep(CHUNK_DELAY);
    }
  }

  const deduplicated = deduplicateArticles(allArticles);
  const sorted = sortArticles(deduplicated, sort);

  return {
    articles: sorted,
    regionCount: seenIds.size,
  };
}

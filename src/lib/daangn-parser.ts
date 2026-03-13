import * as cheerio from "cheerio";
import { Article, SiblingRegion } from "./types";

function extractRemixContext(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  let context: Record<string, unknown> | null = null;

  $("script").each((_, el) => {
    const text = $(el).text();
    if (text.includes("window.__remixContext")) {
      const match = text.match(
        /window\.__remixContext\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/
      );
      if (match) {
        try {
          context = JSON.parse(match[1]);
        } catch {
          // Try extracting the outermost JSON object
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

function getRouteLoaderData(
  context: Record<string, unknown>
): Record<string, unknown> | null {
  const state = context.state as Record<string, unknown> | undefined;
  if (!state) return null;

  const loaderData = state.loaderData as Record<string, unknown> | undefined;
  if (!loaderData) return null;

  // Find the route key that contains buy-sell search data
  for (const key of Object.keys(loaderData)) {
    if (key.includes("buy-sell")) {
      const route = loaderData[key] as Record<string, unknown> | undefined;
      if (route) return route;
    }
  }

  return null;
}

export function parseArticles(html: string): Article[] {
  const context = extractRemixContext(html);
  if (!context) return [];

  const route = getRouteLoaderData(context);
  if (!route) return [];

  const allPage = route.allPage as Record<string, unknown> | undefined;
  if (!allPage) return [];

  const raw = allPage.fleamarketArticles;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: Record<string, unknown>): Article | null => {
      try {
        const regionObj = item.region as
          | Record<string, unknown>
          | undefined;
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

  const route = getRouteLoaderData(context);
  if (!route) return [];

  const regionFilter = route.regionFilterOptions as
    | Record<string, unknown>
    | undefined;
  if (!regionFilter) return [];

  const siblings = regionFilter.siblingRegions;
  if (!Array.isArray(siblings)) return [];

  return siblings
    .map((r: Record<string, unknown>): SiblingRegion | null => {
      const id = Number(r.name3Id || r.id);
      const name = String(r.name || r.name3 || "");
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((r): r is SiblingRegion => r !== null);
}

import { Article, SiblingRegion } from "./types";

interface DaangnRouteData {
  allPage?: {
    fleamarketArticles?: RawArticle[];
  };
  regionFilterOptions?: {
    siblingRegions?: RawSiblingRegion[];
  };
}

interface RawArticle {
  id?: string;
  title?: string;
  price?: string;
  thumbnail?: string;
  status?: string;
  createdAt?: string;
  href?: string;
  region?: { name?: string };
}

interface RawSiblingRegion {
  name3Id?: number;
  id?: number;
  name?: string;
  name3?: string;
}

const ALLOWED_HREF_ORIGIN = "https://www.daangn.com";
const ALLOWED_IMAGE_HOSTS = [
  "dnvefa72aowie.cloudfront.net",
  "img.kr.gcp-karroter.net",
];

function sanitizeHref(href: string): string {
  if (href.startsWith(ALLOWED_HREF_ORIGIN + "/")) return href;
  if (href.startsWith("/")) return `${ALLOWED_HREF_ORIGIN}${href}`;
  return "";
}

function sanitizeThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      return url;
    }
  } catch {}
  return "";
}

export function parseArticles(data: DaangnRouteData): Article[] {
  const raw = data.allPage?.fleamarketArticles;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): Article | null => {
      try {
        const href = sanitizeHref(String(item.href || ""));
        if (!href) return null;

        return {
          id: String(item.id || ""),
          title: String(item.title || ""),
          price: Math.floor(parseFloat(String(item.price || "0"))),
          thumbnail: sanitizeThumbnail(String(item.thumbnail || "")),
          status: String(item.status || "Ongoing") as Article["status"],
          region: item.region?.name ? String(item.region.name) : "",
          createdAt: String(item.createdAt || ""),
          href,
        };
      } catch {
        return null;
      }
    })
    .filter((a): a is Article => a !== null && a.id !== "");
}

export function parseSiblingRegions(data: DaangnRouteData): SiblingRegion[] {
  const siblings = data.regionFilterOptions?.siblingRegions;
  if (!Array.isArray(siblings)) return [];

  return siblings
    .map((r): SiblingRegion | null => {
      const id = Number(r.name3Id || r.id);
      const name = String(r.name || r.name3 || "");
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((r): r is SiblingRegion => r !== null);
}

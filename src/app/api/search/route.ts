// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchDaangn, searchDaangnCity } from "@/lib/daangn-fetcher";
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
  const search = params.get("search");
  const onlyOnSale = params.get("onlyOnSale") === "true";
  const VALID_SORTS: SortType[] = ["recent", "price_asc", "price_desc"];
  const sortParam = params.get("sort") || "recent";
  const sort: SortType = VALID_SORTS.includes(sortParam as SortType) ? (sortParam as SortType) : "recent";
  const level = params.get("level") || "district";

  if (!search) {
    return NextResponse.json(
      { error: "Missing required parameter: search" },
      { status: 400 }
    );
  }

  try {
    let result;

    if (level === "city") {
      const cityName = params.get("cityName");
      if (!cityName) {
        return NextResponse.json(
          { error: "Missing required parameter: cityName" },
          { status: 400 }
        );
      }
      result = await searchDaangnCity(cityName, search, onlyOnSale, sort);
    } else {
      const regionName = params.get("regionName");
      const regionId = params.get("regionId");
      if (!regionName || !regionId) {
        return NextResponse.json(
          { error: "Missing required parameters: regionName, regionId" },
          { status: 400 }
        );
      }
      result = await searchDaangn(regionName, parseInt(regionId, 10), search, onlyOnSale, sort);
    }

    return NextResponse.json({
      articles: result.articles,
      resultCount: result.articles.length,
      regionCount: result.regionCount,
      truncated: result.truncated,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}

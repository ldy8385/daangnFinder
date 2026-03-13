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

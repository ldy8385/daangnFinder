// src/app/api/regions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchRegions } from "@/lib/regions";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const results = searchRegions(q);
  return NextResponse.json(results);
}

"use client";

import { useState, useCallback, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import SortFilter from "@/components/SortFilter";
import ArticleGrid from "@/components/ArticleGrid";
import { Article, RegionEntry, SortType, SearchResult } from "@/lib/types";

export default function Home() {
  const [rawArticles, setRawArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [sort, setSort] = useState<SortType>("recent");
  const [resultCount, setResultCount] = useState(0);
  const [regionCount, setRegionCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRegion, setLastRegion] = useState<RegionEntry | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const displayedArticles = useMemo(() => {
    let filtered = rawArticles;
    if (onlyOnSale) {
      filtered = filtered.filter((a) => a.status === "Ongoing");
    }
    const sorted = [...filtered];
    switch (sort) {
      case "recent":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
    }
    return sorted;
  }, [rawArticles, onlyOnSale, sort]);

  const doSearch = useCallback(
    async (region: RegionEntry, query: string) => {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          search: query,
          onlyOnSale: "false",
          sort: "recent",
          level: region.level,
        });

        if (region.level === "city") {
          params.set("cityName", region.depth1);
        } else {
          params.set("regionName", region.representativeName);
          params.set("regionId", String(region.representativeId));
        }

        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "검색에 실패했습니다");
        }

        const data: SearchResult = await res.json();
        setRawArticles(data.articles);
        setResultCount(data.resultCount);
        setRegionCount(data.regionCount);
        setTruncated(data.truncated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "검색에 실패했습니다");
        setRawArticles([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSearch = (region: RegionEntry, query: string) => {
    setLastRegion(region);
    setLastQuery(query);
    doSearch(region, query);
  };

  const handleOnlyOnSaleChange = (value: boolean) => {
    setOnlyOnSale(value);
  };

  const handleSortChange = (value: SortType) => {
    setSort(value);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-warm-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <svg viewBox="0 0 64 64" className="w-9 h-9 shrink-0">
              <defs>
                <linearGradient id="hc" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#FF8A3D" }} />
                  <stop offset="100%" style={{ stopColor: "#FF6F0F" }} />
                </linearGradient>
                <linearGradient id="hl" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: "#4CAF50" }} />
                  <stop offset="100%" style={{ stopColor: "#66BB6A" }} />
                </linearGradient>
              </defs>
              <path d="M32 58c-2 0-3.5-1-4.5-3C24 48 20 38 19 32c-1.5-8 2-14 7-17s11-3 16 0 8.5 9 7 17c-1 6-5 16-8.5 23-1 2-2.5 3-4.5 3h-4z" fill="url(#hc)" />
              <path d="M32 18c-3-6-9-10-14-12 4-2 10 0 14 6" fill="url(#hl)" />
              <path d="M32 18c3-6 9-10 14-12-4-2-10 0-14 6" fill="url(#hl)" />
              <path d="M32 18c0-7 1-13 0-16 1 3 2 9 0 16" fill="url(#hl)" opacity="0.8" />
              <circle cx="44" cy="44" r="8" fill="white" opacity="0.9" />
              <circle cx="44" cy="44" r="6" fill="none" stroke="#FF6F0F" strokeWidth="2.5" />
              <line x1="48.5" y1="48.5" x2="54" y2="54" stroke="#FF6F0F" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-warm-800 leading-tight">
                daangnFinder
              </h1>
              <p className="text-xs text-warm-400">
                시/구 단위 당근마켓 통합 검색
              </p>
            </div>
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-5">
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

        {truncated && !isLoading && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            결과가 너무 많아 일부만 표시됩니다. 더 정확한 검색어를 사용하거나 구 단위로 검색해보세요.
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-warm-600">{error}</p>
            <button
              onClick={() => lastRegion && lastQuery && doSearch(lastRegion, lastQuery)}
              className="mt-3 px-5 py-2.5 bg-carrot-500 text-white rounded-full font-medium hover:bg-carrot-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {!error && (
          <ArticleGrid
            articles={displayedArticles}
            isLoading={isLoading}
            hasSearched={hasSearched}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-200 bg-warm-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <ul className="text-xs text-warm-400 space-y-1 leading-relaxed">
            <li>당근마켓 웹 검색 데이터 기반이며, 모바일 앱과 검색 결과가 다를 수 있습니다.</li>
            <li>일부 검색어는 앱에서만 결과가 나오고 웹에서는 나오지 않을 수 있습니다.</li>
            <li>각 동네별 최근 게시글 기준으로 검색되며, 전체 게시글을 포함하지 않을 수 있습니다.</li>
            <li>당근마켓 서버 상태에 따라 일부 동네의 결과가 누락될 수 있습니다.</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

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
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [sort, setSort] = useState<SortType>("recent");
  const [resultCount, setResultCount] = useState(0);
  const [regionCount, setRegionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastRegion, setLastRegion] = useState<RegionEntry | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const doSearch = useCallback(
    async (region: RegionEntry, query: string, sale: boolean, sortBy: SortType) => {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          search: query,
          onlyOnSale: String(sale),
          sort: sortBy,
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
            daangnFinder
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

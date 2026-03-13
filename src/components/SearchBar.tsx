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
          placeholder="지역 검색 (예: 서울, 강남구)"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white text-gray-900"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((region) => (
              <button
                key={`${region.depth1}-${region.depth2}-${region.level}`}
                type="button"
                onClick={() => handleSelectRegion(region)}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 text-gray-900 border-b border-gray-100 last:border-0"
              >
                {region.level === "city" ? (
                  <>
                    <span className="font-medium">{region.depth1}</span>
                    <span className="text-orange-500 text-xs ml-2">시 전체</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{region.depth2}</span>
                    <span className="text-gray-500 text-sm ml-2">{region.depth1}</span>
                  </>
                )}
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

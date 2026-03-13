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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const regionInputRef = useRef<HTMLInputElement>(null);

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
      setHighlightedIndex(-1);
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
    setHighlightedIndex(-1);
  };

  const handleRegionKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectRegion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClearRegion = () => {
    setSelectedRegion(null);
    setRegionQuery("");
    setSuggestions([]);
    regionInputRef.current?.focus();
  };

  const handleRegionInputChange = (value: string) => {
    setRegionQuery(value);
    if (selectedRegion) {
      setSelectedRegion(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRegion && searchQuery.trim()) {
      onSearch(selectedRegion, searchQuery.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      {/* Region input */}
      <div className="relative flex-1" ref={suggestionsRef}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <input
            ref={regionInputRef}
            type="text"
            value={regionQuery}
            onChange={(e) => handleRegionInputChange(e.target.value)}
            onKeyDown={handleRegionKeyDown}
            onFocus={() => {
              if (selectedRegion) {
                regionInputRef.current?.select();
              }
            }}
            placeholder="지역 (예: 강남구, 수원시)"
            className={`w-full pl-9 pr-9 py-2.5 rounded-xl text-sm transition-all ${
              selectedRegion
                ? "bg-carrot-50 border-2 border-carrot-300 text-warm-800"
                : "bg-warm-100 border-2 border-transparent text-warm-800 placeholder:text-warm-400 focus:border-carrot-400 focus:bg-white"
            } outline-none`}
          />
          {selectedRegion && (
            <button
              type="button"
              onClick={handleClearRegion}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-warm-300 text-white hover:bg-warm-400 transition-colors text-xs"
              aria-label="지역 선택 해제"
            >
              &times;
            </button>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1.5 bg-white rounded-xl shadow-lg border border-warm-200 max-h-64 overflow-y-auto">
            {suggestions.map((region, index) => (
              <button
                key={`${region.depth1}-${region.depth2}-${region.level}`}
                type="button"
                onClick={() => handleSelectRegion(region)}
                ref={(el) => {
                  if (index === highlightedIndex && el) {
                    el.scrollIntoView({ block: "nearest" });
                  }
                }}
                className={`w-full text-left px-4 py-3 text-warm-800 border-b border-warm-100 last:border-0 flex items-center gap-2 transition-colors ${
                  index === highlightedIndex ? "bg-carrot-50" : "hover:bg-carrot-50"
                }`}
              >
                <svg className="w-4 h-4 text-warm-300 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {region.level === "city" ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-sm">{region.depth1}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-carrot-100 text-carrot-600 font-medium">전체</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{region.depth2}</span>
                    <span className="text-xs text-warm-400">{region.depth1}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search input */}
      <div className="relative flex-[1.5]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-warm-100 border-2 border-transparent text-sm text-warm-800 placeholder:text-warm-400 focus:border-carrot-400 focus:bg-white outline-none transition-all"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedRegion || !searchQuery.trim() || isLoading}
        className="px-6 py-2.5 bg-carrot-500 text-white font-medium text-sm rounded-xl hover:bg-carrot-600 disabled:bg-warm-200 disabled:text-warm-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            검색 중
          </span>
        ) : "검색"}
      </button>
    </form>
  );
}

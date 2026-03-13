"use client";

import { SortType } from "@/lib/types";

interface SortFilterProps {
  onlyOnSale: boolean;
  sort: SortType;
  resultCount: number;
  regionCount: number;
  onOnlyOnSaleChange: (value: boolean) => void;
  onSortChange: (value: SortType) => void;
}

export default function SortFilter({
  onlyOnSale,
  sort,
  resultCount,
  regionCount,
  onOnlyOnSaleChange,
  onSortChange,
}: SortFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onOnlyOnSaleChange(!onlyOnSale)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            onlyOnSale
              ? "bg-orange-500 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          거래가능만
        </button>
        <span className="text-sm text-gray-500">
          {regionCount}개 동에서 {resultCount}개 결과
        </span>
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortType)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white text-gray-900"
      >
        <option value="recent">최신순</option>
        <option value="price_asc">가격 낮은순</option>
        <option value="price_desc">가격 높은순</option>
      </select>
    </div>
  );
}

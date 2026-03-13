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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-3 mb-3">
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onOnlyOnSaleChange(!onlyOnSale)}
          className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all border ${
            onlyOnSale
              ? "bg-carrot-500 text-white border-carrot-500"
              : "bg-white text-warm-600 border-warm-200 hover:border-warm-300"
          }`}
        >
          거래가능만
        </button>
        <span className="text-[13px] text-warm-400">
          <span className="text-warm-600 font-medium">{regionCount}</span>개 동 ·{" "}
          <span className="text-warm-600 font-medium">{resultCount.toLocaleString()}</span>건
        </span>
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortType)}
        className="px-3 py-1.5 rounded-xl border border-warm-200 text-[13px] bg-white text-warm-700 outline-none focus:border-carrot-400 transition-colors"
      >
        <option value="recent">최신순</option>
        <option value="price_asc">가격 낮은순</option>
        <option value="price_desc">가격 높은순</option>
      </select>
    </div>
  );
}

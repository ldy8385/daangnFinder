import { Article } from "@/lib/types";
import ArticleCard from "./ArticleCard";

interface ArticleGridProps {
  articles: Article[];
  isLoading: boolean;
  hasSearched: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-warm-200 animate-pulse">
      <div className="aspect-square bg-warm-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-warm-100 rounded-lg w-4/5" />
        <div className="h-5 bg-warm-100 rounded-lg w-2/5" />
        <div className="h-3 bg-warm-100 rounded-lg w-1/3" />
      </div>
    </div>
  );
}

export default function ArticleGrid({ articles, isLoading, hasSearched }: ArticleGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (hasSearched && articles.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm-100 mb-4">
          <svg className="w-8 h-8 text-warm-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p className="text-warm-600 font-medium">검색 결과가 없습니다</p>
        <p className="text-sm text-warm-400 mt-1">다른 검색어나 지역으로 시도해보세요</p>
        <p className="text-xs text-warm-300 mt-4">
          웹 검색 기반이라 일부 검색어는 앱에서만 결과가 나올 수 있습니다
        </p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-24">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-carrot-50 mb-5">
          <svg viewBox="0 0 64 64" className="w-10 h-10">
            <defs>
              <linearGradient id="ec" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#FFB876" }} />
                <stop offset="100%" style={{ stopColor: "#FF6F0F" }} />
              </linearGradient>
            </defs>
            <path d="M32 58c-2 0-3.5-1-4.5-3C24 48 20 38 19 32c-1.5-8 2-14 7-17s11-3 16 0 8.5 9 7 17c-1 6-5 16-8.5 23-1 2-2.5 3-4.5 3h-4z" fill="url(#ec)" opacity="0.4" />
            <path d="M32 18c-3-6-9-10-14-12 4-2 10 0 14 6" fill="#66BB6A" opacity="0.4" />
            <path d="M32 18c3-6 9-10 14-12-4-2-10 0-14 6" fill="#66BB6A" opacity="0.4" />
          </svg>
        </div>
        <p className="text-warm-500 font-medium">지역과 검색어를 입력해보세요</p>
        <p className="text-sm text-warm-400 mt-1">구 단위, 시 전체로 한번에 검색할 수 있어요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

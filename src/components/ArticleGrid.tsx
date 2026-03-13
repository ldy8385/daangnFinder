import { Article } from "@/lib/types";
import ArticleCard from "./ArticleCard";

interface ArticleGridProps {
  articles: Article[];
  isLoading: boolean;
  hasSearched: boolean;
}

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function ArticleGrid({ articles, isLoading, hasSearched }: ArticleGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (hasSearched && articles.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">검색 결과가 없습니다</p>
        <p className="text-sm mt-2">다른 검색어나 지역으로 시도해보세요</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">지역과 검색어를 입력해주세요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

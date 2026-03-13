import { Article } from "@/lib/types";

interface ArticleCardProps {
  article: Article;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return `${Math.floor(diffDay / 30)}달 전`;
}

function formatPrice(price: number): string {
  if (price === 0) return "나눔";
  return price.toLocaleString("ko-KR") + "원";
}

const statusBadge: Record<string, { text: string; className: string }> = {
  Reserved: { text: "예약중", className: "bg-green-100 text-green-700" },
  Closed: { text: "판매완료", className: "bg-gray-100 text-gray-500" },
};

export default function ArticleCard({ article }: ArticleCardProps) {
  const badge = statusBadge[article.status];

  return (
    <a
      href={`https://www.daangn.com${article.href}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
    >
      <div className="relative aspect-square bg-gray-100">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            이미지 없음
          </div>
        )}
        {badge && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug">
          {article.title}
        </h3>
        <p className="text-orange-600 font-bold mt-1">
          {formatPrice(article.price)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {article.region} · {timeAgo(article.createdAt)}
        </p>
      </div>
    </a>
  );
}

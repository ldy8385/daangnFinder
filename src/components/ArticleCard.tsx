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
  Reserved: { text: "예약중", className: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  Closed: { text: "판매완료", className: "bg-warm-100 text-warm-400 border border-warm-200" },
};

export default function ArticleCard({ article }: ArticleCardProps) {
  const badge = statusBadge[article.status];
  const isClosed = article.status === "Closed";

  return (
    <a
      href={article.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 border border-warm-200 hover:border-warm-300"
    >
      <div className={`relative aspect-square bg-warm-100 overflow-hidden ${isClosed ? "opacity-60" : ""}`}>
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warm-300">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        {badge && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[11px] font-medium ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-warm-800 text-[13px] line-clamp-2 leading-snug">
          {article.title}
        </h3>
        <p className={`font-bold text-[15px] mt-1 ${article.price === 0 ? "text-carrot-500" : "text-warm-900"}`}>
          {formatPrice(article.price)}
        </p>
        <p className="text-[11px] text-warm-400 mt-1.5">
          {article.region} · {timeAgo(article.createdAt)}
        </p>
      </div>
    </a>
  );
}

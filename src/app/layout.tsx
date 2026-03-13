import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://daangnfinder.com";

export const metadata: Metadata = {
  title: "daangnFinder - 당근마켓 지역 통합 검색",
  description: "시/구 단위로 당근마켓 중고거래를 한번에 검색하세요",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "daangnFinder - 당근마켓 지역 통합 검색",
    description: "시/구 단위로 당근마켓 중고거래를 한번에 검색하세요",
    url: SITE_URL,
    siteName: "daangnFinder",
    images: [
      {
        url: `${SITE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "daangnFinder",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "daangnFinder - 당근마켓 지역 통합 검색",
    description: "시/구 단위로 당근마켓 중고거래를 한번에 검색하세요",
    images: [`${SITE_URL}/og-image.svg`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}

export interface Article {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  status: "Ongoing" | "Closed" | "Reserved";
  region: string;
  createdAt: string;
  href: string;
}

export interface RegionEntry {
  name: string;       // "서울특별시 강남구" or "서울특별시"
  depth1: string;     // "서울특별시"
  depth2: string;     // "강남구" or "" for city-level
  representativeId: number;
  representativeName: string;
  level: "city" | "district";
}

export interface SiblingRegion {
  id: number;
  name: string;
}

export interface SearchResult {
  articles: Article[];
  resultCount: number;
  regionCount: number;
  truncated: boolean;
}

export type SortType = "recent" | "price_asc" | "price_desc";

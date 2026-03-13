# daangnFinder — 시/구 단위 당근마켓 검색기

## 목적

당근마켓은 동 단위로만 검색이 가능하여, 넓은 지역을 검색하려면 동을 일일이 바꿔야 한다. daangnFinder는 시/구 단위를 선택하면 해당 구 내 모든 동을 병렬 검색하여 결과를 합쳐 보여주는 웹앱이다.

## 아키텍처

```
브라우저 (Next.js React) → API Route (/api/search) → 당근마켓 (daangn.com SSR)
```

- **프론트엔드**: Next.js + React + Tailwind CSS
- **백엔드**: Next.js API Routes (CORS 프록시 역할)
- **HTML 파싱**: cheerio로 `window.__remixContext` 내 loaderData 추출
- **지역 데이터**: 정적 JSON (시/구/동 매핑)

별도 DB, 인증, 회원관리 없음.

## 검색 흐름

1. 사용자가 지역(자동완성) + 검색어 입력 → 검색 버튼 클릭
2. 프론트가 `/api/search?region=강남구&regionId=XXX&search=rx100&onlyOnSale=true` 호출
3. API Route가 해당 구의 대표 동 하나로 당근마켓 검색 → 응답의 `siblingRegions`로 구 내 모든 동 ID 수집
4. 모든 동에 병렬 요청 (당근 URL: `/kr/buy-sell/s/?in=동명-ID&search=키워드&only_on_sale=true`)
5. 각 응답 HTML에서 `window.__remixContext`의 `fleamarketArticles` 추출
6. 결과 합치기 → 중복 제거(id 기준) → 정렬 → JSON 응답

## API 설계

### GET /api/regions?q={검색어}

지역 자동완성용. 정적 JSON에서 시/구명을 검색하여 반환.

**응답:**
```json
[
  { "name": "서울특별시 강남구", "depth1": "서울특별시", "depth2": "강남구", "representativeId": 958, "representativeName": "역삼동" },
  ...
]
```

### GET /api/search

**파라미터:**
- `regionName`: 대표 동 이름 (예: "역삼동")
- `regionId`: 대표 동 ID (예: 958)
- `search`: 검색 키워드
- `onlyOnSale`: 거래가능만 (기본 true)
- `sort`: 정렬 (recent, price_asc, price_desc)

**응답:**
```json
{
  "articles": [
    {
      "id": "abc123",
      "title": "소니 RX100 M7",
      "price": 850000,
      "thumbnail": "https://img.kr.gcp-karroter.net/...",
      "status": "Ongoing",
      "region": "역삼동",
      "createdAt": "2026-03-10T13:08:41.369+09:00",
      "href": "/kr/buy-sell/소니-rx100-m7-abc123/"
    }
  ],
  "resultCount": 45,
  "regionCount": 24
}
```

## UI 구성

### 검색바
- 지역 입력 필드 (자동완성, `/api/regions` 호출)
- 검색어 입력 필드
- 검색 버튼
- 한 줄로 배치

### 필터/정렬
- 거래가능만 토글 (기본 ON)
- 정렬 드롭다운: 최신순 / 가격 낮은순 / 가격 높은순

### 결과 그리드
- 반응형 그리드 (PC 4열, 태블릿 3열, 모바일 2열)
- 각 카드: 썸네일, 제목, 가격, 지역(동), 작성시간
- 카드 클릭 → 당근마켓 상세페이지로 새 탭 이동

### 상태 표시
- 로딩: 스켈레톤 UI 또는 스피너 + "N개 동 검색 중..."
- 빈 결과: 안내 메시지
- 에러: 재시도 버튼

## 지역 데이터

시/구 목록을 정적 JSON으로 관리. 각 구에 대표 동 하나의 ID를 매핑.

수집 방법: 당근마켓 페이지의 `siblingRegions` + `regionFilterOptions.parentRegion` 데이터를 활용하여 주요 시/구의 대표 동 ID를 사전 수집.

```json
{
  "서울특별시": {
    "강남구": { "representativeId": 958, "representativeName": "역삼동" },
    "서초구": { "representativeId": 6128, "representativeName": "서초동" }
  }
}
```

검색 시 대표 동으로 첫 요청 → siblingRegions에서 구 내 전체 동 목록을 동적으로 획득.

## 기술 스택

- **Next.js 14+** (App Router)
- **React 18**
- **Tailwind CSS**
- **cheerio** (HTML 파싱)
- **TypeScript**

## 당근마켓 원본 데이터 필드 매핑

`window.__remixContext.loaderData`의 `fleamarketArticles` 배열 항목:

| 원본 필드 | 앱 필드 | 비고 |
|-----------|--------|------|
| `id` (URL 경로) | `id` | 중복 제거 키 |
| `title` | `title` | |
| `price` (문자열 "350000.0") | `price` (number) | parseFloat 후 정수 변환 |
| `thumbnail` (webp URL) | `thumbnail` | |
| `status` ("Ongoing"/"Closed"/"Reserved") | `status` | |
| `region.name` | `region` | 동 이름 |
| `createdAt` (ISO 8601) | `createdAt` | |
| `href` | `href` | 상세페이지 경로 |

## 제약사항 및 고려사항

- **siblingRegions 신뢰성**: 대표 동 요청 시 반환되는 siblingRegions가 구 내 전체 동을 포함하지 않을 수 있음. siblingRegions 수가 5개 미만이면 정적 JSON에 사전 수집한 동 목록으로 폴백.
- **요청 타임아웃**: 개별 동 요청에 5초 타임아웃 적용. 타임아웃된 동은 건너뛰고 성공한 결과만 반환 (부분 결과 허용).
- **정렬 한계**: 각 동의 첫 페이지 결과만 가져오므로 전체 정렬이 아닌 수집된 결과 내 정렬. UI에 "각 동의 최근 게시글 기준" 안내 표시.
- **페이지네이션 없음**: 각 동의 첫 페이지 결과만 수집. `resultCount`로 실제 반환 건수 표시 (전체 건수가 아님을 명시).
- **인바운드 rate limit**: `/api/search`에 IP당 분당 10회 제한 적용 (당근마켓 IP 차단 방지).
- 당근마켓 rate limiting: 요청 간 적절한 딜레이 (50~100ms) 적용
- 구당 동 수가 20~30개이므로 한 검색에 최대 30건 요청 — 허용 범위
- 당근마켓 HTML 구조 변경 시 파서 업데이트 필요
- **배포**: Vercel Free (Hobby). 10초 함수 타임아웃 대응을 위해 동을 10개씩 청크 분할하여 순차 요청. 트래픽 증가 시 Cloudflare Pages 이전 고려.
- **광고**: Google AdSense 삽입 (검색 결과 사이 또는 상/하단).
- 당근마켓 HTML 구조 변경 시 파서 업데이트 필요

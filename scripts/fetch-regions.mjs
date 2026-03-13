#!/usr/bin/env node

/**
 * 당근마켓에서 전국 지역 데이터를 가져와 regions.json을 생성하는 스크립트
 *
 * 1단계: /kr/regions 에서 전체 시/도 + 구/군 목록 가져오기
 * 2단계: 각 구/군의 대표동(representativeDong) ID를 Remix data loader로 조회
 * 3단계: regions.json 형식으로 변환 후 저장
 */

const DAANGN_BASE = "https://www.daangn.com";
const REMIX_DATA_SUFFIX = "&_data=routes%2Fkr.buy-sell.s";
const CHUNK_SIZE = 5;
const CHUNK_DELAY = 300;
const REQUEST_TIMEOUT = 8000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Accept: "application/json",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: HEADERS });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 1단계: 전체 지역 목록 가져오기
async function fetchAllRegions() {
  console.log("1단계: 전체 지역 목록 가져오기...");
  const url = `${DAANGN_BASE}/kr/regions?_data=routes%2Fkr.regions._index`;
  const data = await fetchWithTimeout(url);
  console.log(`  → ${data.allRegions.length}개 시/도 발견`);
  return data.allRegions;
}

// 2단계: 구/군 → 대표동 매핑
async function fetchRepresentativeDong(districtName, districtId) {
  const encoded = encodeURIComponent(districtName);
  const url = `${DAANGN_BASE}/kr/buy-sell/s/?in=${encoded}-${districtId}&search=a${REMIX_DATA_SUFFIX}`;
  const data = await fetchWithTimeout(url);

  const rf = data.regionFilterOptions;
  if (!rf || !rf.region) return null;

  return {
    name3Id: rf.region.name3Id || rf.region.id,
    name3: rf.region.name3 || rf.region.name,
  };
}

async function fetchChunk(districts, cityName) {
  const results = await Promise.allSettled(
    districts.map(async (d) => {
      const dong = await fetchRepresentativeDong(d.regionName, d.regionId);
      if (!dong) {
        console.log(`  ⚠ ${cityName} ${d.regionName}: 대표동 조회 실패`);
        return null;
      }
      return {
        name: `${cityName} ${d.regionName}`,
        depth1: cityName,
        depth2: d.regionName,
        representativeId: dong.name3Id,
        representativeName: dong.name3,
        level: "district",
      };
    })
  );

  return results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

async function main() {
  const allRegions = await fetchAllRegions();

  const entries = [];
  let totalDistricts = 0;

  for (const city of allRegions) {
    const cityName = city.regionName;
    const children = city.childrenRegion || [];

    // 시/도 레벨 엔트리 추가
    entries.push({
      name: cityName,
      depth1: cityName,
      depth2: "",
      representativeId: 0,
      representativeName: "",
      level: "city",
    });

    // 세종특별자치시: 구 없이 동/면이 직접 하위 (depth=3)
    if (children.length > 0 && children[0].depth === 3) {
      console.log(`\n${cityName}: 동/면 직접 하위 (${children.length}개)`);
      // 세종시는 대표동 하나만 등록 (district처럼 취급)
      const firstChild = children[0];
      entries.push({
        name: `${cityName} ${cityName}`,
        depth1: cityName,
        depth2: cityName,
        representativeId: firstChild.regionId,
        representativeName: firstChild.regionName,
        level: "district",
      });
      totalDistricts += 1;
      continue;
    }

    console.log(`\n${cityName}: ${children.length}개 구/군 처리 중...`);

    // 청크 단위로 대표동 조회
    for (let i = 0; i < children.length; i += CHUNK_SIZE) {
      const chunk = children.slice(i, i + CHUNK_SIZE);
      const results = await fetchChunk(chunk, cityName);
      entries.push(...results);
      totalDistricts += results.length;

      const progress = Math.min(i + CHUNK_SIZE, children.length);
      process.stdout.write(
        `  [${progress}/${children.length}] ${results.map((r) => r.depth2).join(", ")}\n`
      );

      if (i + CHUNK_SIZE < children.length) {
        await sleep(CHUNK_DELAY);
      }
    }
  }

  console.log(`\n3단계: regions.json 저장...`);
  console.log(`  → 시/도: ${allRegions.length}개, 구/군: ${totalDistricts}개`);

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.default.join(
    import.meta.dirname,
    "..",
    "src",
    "data",
    "regions.json"
  );
  fs.default.writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n");
  console.log(`  → ${outPath} 저장 완료!`);
}

main().catch((err) => {
  console.error("오류 발생:", err);
  process.exit(1);
});

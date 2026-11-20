// 카페 지도용 기준 데이터
export const CAFE_REGIONS = ['서울', '경기·인천', '강원', '대전·충청', '대구·경북', '부산·울산·경남', '광주·전라', '제주'];

export const CAFE_TAGS = [
  '핸드드립', '에스프레소 바', '로스터리', '싱글오리진', '원두 판매', '디저트 맛집',
  '작업하기 좋음', '조용함', '뷰 맛집', '반려동물 가능', '늦게까지',
];

// 주소 글자로 지역 추정 (지오코딩 결과·직접 입력 모두)
const REGION_KEYS = [
  ['서울', ['서울']],
  ['경기·인천', ['경기', '인천']],
  ['강원', ['강원']],
  ['대전·충청', ['대전', '세종', '충청', '충북', '충남']],
  ['대구·경북', ['대구', '경상북', '경북']],
  ['부산·울산·경남', ['부산', '울산', '경상남', '경남']],
  ['광주·전라', ['광주', '전라', '전북', '전남']],
  ['제주', ['제주']],
];

export function guessRegion(address) {
  const a = String(address ?? '');
  for (const [region, keys] of REGION_KEYS) if (keys.some((k) => a.includes(k))) return region;
  return '';
}

// 대한민국 전체가 보이는 기본 범위 [[남서], [북동]]
export const KOREA_BOUNDS = [[33.0, 124.6], [38.65, 130.95]];

// 외부 지도 앱으로 열기 (키 없이 쓰는 공개 링크)
export function kakaoMapUrl(cafe) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(cafe.name)},${cafe.lat},${cafe.lng}`;
}
export function naverMapUrl(cafe) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${cafe.name} ${cafe.address ?? ''}`.trim())}`;
}

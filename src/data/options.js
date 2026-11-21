import { COFFEE_ORIGINS } from './origins.js';

export const PROCESSES = ['워시드', '내추럴', '허니', '무산소 발효', '기타'];
export function processOption(value) {
  return value && !PROCESSES.includes(value) ? '기타' : value;
}
export const ROAST_LEVELS = ['라이트', '미디엄 라이트', '미디엄', '미디엄 다크', '다크'];
// 노트의 추출 방식: 부원들이 주로 쓰는 핸드드립 드리퍼 위주. 목록에 없으면 '기타' + 직접 입력
export const BREW_METHODS = ['V60', '오리가미', '오레아', 'UFO', '하리오 스위치', '에어로프레스', '에스프레소', '카페에서', '기타'];
export function methodOption(value) {
  return value && !BREW_METHODS.includes(value) ? '기타' : value;
}
// 레시피는 침출식·대용량도 있어서 따로 (표준 레시피의 칼리타·케멕스·프렌치프레스·콜드브루 포함)
export const RECIPE_METHODS = ['V60', '칼리타', '케멕스', '오리가미', '오레아', 'UFO', '하리오 스위치', '에어로프레스', '프렌치프레스', '에스프레소', '콜드브루'];
// 산지 입력 자동완성: 지도에 있는 커피 산지 + 블렌드
export const ORIGINS = [...COFFEE_ORIGINS.map((o) => o.name), '블렌드'];

export const ATTRIBUTES = [
  { key: 'acidity', label: '산미', low: '부드러움', high: '선명함' },
  { key: 'sweetness', label: '단맛', low: '옅음', high: '풍부함' },
  { key: 'body', label: '바디', low: '가벼움', high: '묵직함' },
  { key: 'bitterness', label: '쓴맛', low: '적음', high: '강함' },
  { key: 'aftertaste', label: '여운', low: '짧음', high: '길게 남음' },
];

export const ACTIVITY_KINDS = ['정기 모임', '커핑', '브루잉 실습', '카페 투어', '기타'];

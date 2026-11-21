// 마루의 향미 분류(SCA 휠을 참고해 동아리 수준으로 단순화한 자체 목록).
// dot: 분류 색(칩의 작은 점·플레이버 휠 조각), short: 좁은 곳(휴대폰 탭·휠 안쪽 링)에 쓰는 짧은 이름.
export const FLAVOR_GROUPS = [
  { name: '꽃', dot: '#B88AC4', items: ['자스민', '장미', '라벤더', '오렌지 블로섬'] },
  { name: '베리', dot: '#A4344A', items: ['블루베리', '라즈베리', '딸기', '블랙커런트'] },
  { name: '시트러스', dot: '#D9A21B', items: ['레몬', '라임', '오렌지', '자몽', '베르가못'] },
  { name: '과일', dot: '#D9743A', items: ['복숭아', '살구', '체리', '자두', '사과', '청포도', '망고', '파인애플', '패션프루트'] },
  { name: '단맛', dot: '#B9853E', items: ['꿀', '캐러멜', '흑설탕', '메이플', '바닐라'] },
  { name: '견과·초콜릿', short: '초콜릿', dot: '#6B4630', items: ['아몬드', '헤이즐넛', '땅콩', '밀크초콜릿', '다크초콜릿', '카카오닙스'] },
  { name: '향신료·기타', short: '향신료', dot: '#6E7D5B', items: ['시나몬', '정향', '홍차', '허브', '와인', '럼', '스모키'] },
];

const dotByFlavor = new Map(FLAVOR_GROUPS.flatMap((g) => g.items.map((i) => [i, g.dot])));

export function flavorDot(name) {
  return dotByFlavor.get(name) ?? '#9A8F86';
}

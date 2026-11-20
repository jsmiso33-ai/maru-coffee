// 커피 산지 국가 — 지도(world-atlas, ISO 3166 숫자 코드)와 노트의 산지 글자를 잇는다.
// region은 지도 아래 목록 묶음용. 작은 나라(르완다·엘살바도르 등)는 지도에서 누르기 어려워 목록이 같이 필요하다.
export const COFFEE_ORIGINS = [
  { name: '에티오피아', id: '231', region: '아프리카', aliases: ['ethiopia', '에디오피아', '예가체프', '시다마', '구지'] },
  { name: '케냐', id: '404', region: '아프리카', aliases: ['kenya'] },
  { name: '르완다', id: '646', region: '아프리카', aliases: ['rwanda'] },
  { name: '부룬디', id: '108', region: '아프리카', aliases: ['burundi'] },
  { name: '탄자니아', id: '834', region: '아프리카', aliases: ['tanzania', '킬리만자로'] },
  { name: '우간다', id: '800', region: '아프리카', aliases: ['uganda'] },
  { name: '콩고', id: '180', region: '아프리카', aliases: ['congo', 'drc', '콩고민주공화국'] },
  { name: '말라위', id: '454', region: '아프리카', aliases: ['malawi'] },
  { name: '잠비아', id: '894', region: '아프리카', aliases: ['zambia'] },
  { name: '짐바브웨', id: '716', region: '아프리카', aliases: ['zimbabwe'] },
  { name: '카메룬', id: '120', region: '아프리카', aliases: ['cameroon'] },
  { name: '코트디부아르', id: '384', region: '아프리카', aliases: ['ivory coast', "côte d'ivoire"] },
  { name: '예멘', id: '887', region: '아시아·태평양', aliases: ['yemen'] },
  { name: '인도네시아', id: '360', region: '아시아·태평양', aliases: ['indonesia', '인니', '수마트라', '만델링', '자바', '술라웨시', '토라자'] },
  { name: '파푸아뉴기니', id: '598', region: '아시아·태평양', aliases: ['papua new guinea', 'png'] },
  { name: '동티모르', id: '626', region: '아시아·태평양', aliases: ['timor', '티모르'] },
  { name: '베트남', id: '704', region: '아시아·태평양', aliases: ['vietnam', 'viet nam'] },
  { name: '라오스', id: '418', region: '아시아·태평양', aliases: ['laos'] },
  { name: '태국', id: '764', region: '아시아·태평양', aliases: ['thailand'] },
  { name: '미얀마', id: '104', region: '아시아·태평양', aliases: ['myanmar'] },
  { name: '중국', id: '156', region: '아시아·태평양', aliases: ['china', '윈난', '운남', 'yunnan'] },
  { name: '대만', id: '158', region: '아시아·태평양', aliases: ['taiwan'] },
  { name: '인도', id: '356', region: '아시아·태평양', aliases: ['india'] },
  { name: '필리핀', id: '608', region: '아시아·태평양', aliases: ['philippines'] },
  { name: '멕시코', id: '484', region: '중미·카리브', aliases: ['mexico'] },
  { name: '과테말라', id: '320', region: '중미·카리브', aliases: ['guatemala', '안티구아', '우에우에테낭고'] },
  { name: '엘살바도르', id: '222', region: '중미·카리브', aliases: ['el salvador'] },
  { name: '온두라스', id: '340', region: '중미·카리브', aliases: ['honduras'] },
  { name: '니카라과', id: '558', region: '중미·카리브', aliases: ['nicaragua'] },
  { name: '코스타리카', id: '188', region: '중미·카리브', aliases: ['costa rica', '따라주', '타라주'] },
  { name: '파나마', id: '591', region: '중미·카리브', aliases: ['panama', '게이샤 파나마', '보케테'] },
  { name: '자메이카', id: '388', region: '중미·카리브', aliases: ['jamaica', '블루마운틴'] },
  { name: '도미니카공화국', id: '214', region: '중미·카리브', aliases: ['dominican'] },
  { name: '쿠바', id: '192', region: '중미·카리브', aliases: ['cuba'] },
  { name: '콜롬비아', id: '170', region: '남미', aliases: ['colombia', '우일라', '나리뇨', '카우카'] },
  { name: '에콰도르', id: '218', region: '남미', aliases: ['ecuador'] },
  { name: '페루', id: '604', region: '남미', aliases: ['peru'] },
  { name: '볼리비아', id: '068', region: '남미', aliases: ['bolivia'] },
  { name: '브라질', id: '076', region: '남미', aliases: ['brazil', '세하도', '모지아나', '산토스'] },
];

export const ORIGIN_REGIONS = ['아프리카', '중미·카리브', '남미', '아시아·태평양'];

const byId = new Map(COFFEE_ORIGINS.map((o) => [o.id, o]));
export const originById = (id) => byId.get(id) ?? null;

// 긴 이름부터 비교해야 '콩고민주공화국'이 '콩고'보다 먼저 잡힌다
const matchers = COFFEE_ORIGINS
  .flatMap((o) => [o.name, ...o.aliases].map((k) => [k.toLowerCase(), o]))
  .sort((a, b) => b[0].length - a[0].length);

// 노트의 산지 글자("에티오피아 예가체프", "Colombia Huila")에서 나라를 찾는다. 블렌드·모르는 곳이면 null
export function matchOrigin(text) {
  const t = String(text ?? '').trim().toLowerCase();
  if (!t) return null;
  for (const [key, o] of matchers) if (t.includes(key)) return o;
  return null;
}

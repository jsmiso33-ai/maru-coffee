// Supabase 미연결(미리보기) 상태에서 화면 구성을 보여주기 위한 샘플.
export const SAMPLE_NOTES = [
  {
    id: 'sample-1', user_id: null, author_name: '마루 회장', author_avatar: null, created_at: '2026-11-12T10:00:00Z',
    bean_name: '에티오피아 구지 함벨라 G1', roaster: '샘플 로스터리', origin: '에티오피아', process: '내추럴',
    roast_level: '라이트', brew_method: 'V60', tasted_on: '2026-11-12',
    flavors: ['블루베리', '자스민', '꿀', '홍차'],
    acidity: 4, sweetness: 5, body: 2, bitterness: 1, aftertaste: 4, rating: 4.5,
    memo: '식으면서 블루베리잼 같은 단맛이 확 올라옴. 4:6 레시피로 92°C, 분쇄 조금 굵게 했을 때 제일 좋았다.',
  },
  {
    id: 'sample-2', user_id: null, author_name: '김부원', author_avatar: null, created_at: '2026-11-09T10:00:00Z',
    bean_name: '콜롬비아 우일라 핑크버번', roaster: '샘플 로스터리', origin: '콜롬비아', process: '워시드',
    roast_level: '미디엄 라이트', brew_method: '칼리타', tasted_on: '2026-11-09',
    flavors: ['복숭아', '오렌지', '캐러멜'],
    acidity: 3, sweetness: 4, body: 3, bitterness: 2, aftertaste: 3, rating: 4,
    memo: '산미가 튀지 않고 둥글다. 처음 스페셜티 마셔보는 친구한테 추천하기 좋을 듯.',
  },
  {
    id: 'sample-3', user_id: null, author_name: '이부원', author_avatar: null, created_at: '2026-11-03T10:00:00Z',
    bean_name: '브라질 세하도 옐로우버번', roaster: '샘플 로스터리', origin: '브라질', process: '내추럴',
    roast_level: '미디엄', brew_method: '에스프레소', tasted_on: '2026-11-03',
    flavors: ['헤이즐넛', '밀크초콜릿', '흑설탕'],
    acidity: 1, sweetness: 4, body: 5, bitterness: 3, aftertaste: 3, rating: 3.5,
    memo: '라떼 베이스로 최고. 에스프레소 단독은 조금 단조로움.',
  },
];

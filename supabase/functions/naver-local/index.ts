// 네이버 지역 검색 중계 — 카페 이름으로 위치를 찾는다.
// 네이버 검색 API는 Client Secret이 필요하고 브라우저에서 직접 부를 수 없어(CORS) 여기서 대신 부른다.
// 2026년부터 검색 API는 개발자센터(openapi.naver.com)가 아니라 네이버 클라우드 플랫폼 NAVER API HUB에서 발급·호출한다.
//   GET https://naverapihub.apigw.ntruss.com/search/v1/local  (하루 25,000회)
//
// 필요한 Secret (Supabase → Edge Functions → Secrets):
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET  — NCP 콘솔 › NAVER API HUB 앱의 Client ID / Client Secret
// 배포: npx supabase functions deploy naver-local --no-verify-jwt
//   (publishable 키는 JWT가 아니라서 JWT 검사 대신 Origin으로 사이트 밖 호출을 막는다)

const ALLOWED = [/^https:\/\/marucoffee\.life$/, /^https:\/\/jsmiso33-ai\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/];

function cors(origin: string | null) {
  const ok = origin && ALLOWED.some((re) => re.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'https://marucoffee.life',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (!origin || !ALLOWED.some((re) => re.test(origin))) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers });
  }

  let query = '';
  try {
    query = String((await req.json())?.query ?? '').trim();
  } catch { /* 빈 본문 */ }
  if (!query || query.length > 60) {
    return new Response(JSON.stringify({ error: 'query' }), { status: 400, headers });
  }

  const res = await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/local?display=5&sort=random&query=${encodeURIComponent(query)}`, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': Deno.env.get('NAVER_CLIENT_ID') ?? '',
      'X-NCP-APIGW-API-KEY': Deno.env.get('NAVER_CLIENT_SECRET') ?? '',
    },
  });
  if (!res.ok) {
    // 네이버 오류 코드만 넘긴다(키 미구독 210, 인증 실패 등 원인 파악용)
    const detail = (await res.text()).slice(0, 200);
    return new Response(JSON.stringify({ error: `naver ${res.status}`, detail }), { status: 502, headers });
  }
  const data = await res.json();
  // mapx·mapy: WGS84 경도·위도. 기존 API는 ×10^7 정수였으므로 큰 값이면 나눈다
  const coord = (v: string) => { const n = Number(v); return Math.abs(n) > 1000 ? n / 1e7 : n; };
  const places = (data.items ?? []).map((it: Record<string, string>) => ({
    name: stripTags(it.title ?? ''),
    address: it.roadAddress || it.address || '',
    category: it.category ?? '',
    link: it.link ?? '',
    lat: coord(it.mapy),
    lng: coord(it.mapx),
  })).filter((p: { lat: number; lng: number }) => p.lat > 30 && p.lat < 40 && p.lng > 120 && p.lng < 135);

  return new Response(JSON.stringify({ places }), { headers });
});

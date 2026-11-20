// 네이버 지역 검색 중계 — 카페 이름으로 위치를 찾는다.
// 네이버 검색 API는 Client Secret이 필요하고 브라우저에서 직접 부를 수 없어(CORS) 여기서 대신 부른다.
//
// 필요한 Secret (Supabase → Edge Functions → Secrets):
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET  — developers.naver.com 애플리케이션(검색 API)
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

  const res = await fetch(`https://openapi.naver.com/v1/search/local.json?display=5&sort=random&query=${encodeURIComponent(query)}`, {
    headers: {
      'X-Naver-Client-Id': Deno.env.get('NAVER_CLIENT_ID') ?? '',
      'X-Naver-Client-Secret': Deno.env.get('NAVER_CLIENT_SECRET') ?? '',
    },
  });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `naver ${res.status}` }), { status: 502, headers });
  }
  const data = await res.json();
  // mapx·mapy: WGS84 경도·위도 × 10^7
  const places = (data.items ?? []).map((it: Record<string, string>) => ({
    name: stripTags(it.title ?? ''),
    address: it.roadAddress || it.address || '',
    category: it.category ?? '',
    link: it.link ?? '',
    lat: Number(it.mapy) / 1e7,
    lng: Number(it.mapx) / 1e7,
  })).filter((p: { lat: number; lng: number }) => p.lat > 30 && p.lat < 40 && p.lng > 120 && p.lng < 135);

  return new Response(JSON.stringify({ places }), { headers });
});

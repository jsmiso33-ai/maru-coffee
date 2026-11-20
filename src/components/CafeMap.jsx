import { Suspense, lazy } from 'react';

// 네이버 지도 키(VITE_NAVER_MAP_KEY)가 있으면 네이버 지도, 없으면 OpenStreetMap(Leaflet).
// 두 지도는 같은 props를 받는다 — 페이지 코드는 어느 쪽인지 몰라도 된다.
const NAVER_KEY = import.meta.env.VITE_NAVER_MAP_KEY;
const Provider = NAVER_KEY
  ? lazy(() => import('./NaverMap.jsx'))
  : lazy(() => import('./LeafletMap.jsx'));

export const mapProvider = NAVER_KEY ? 'naver' : 'osm';

export default function CafeMap(props) {
  return (
    <Suspense fallback={<div className={`animate-pulse rounded-[var(--radius-card)] bg-sunken ${props.className ?? ''}`} />}>
      <Provider {...props} />
    </Suspense>
  );
}

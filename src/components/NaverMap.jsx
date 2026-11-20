import { useEffect, useRef, useState } from 'react';
import { KOREA_BOUNDS } from '../data/cafes.js';
import { cx } from './ui.jsx';

// 네이버 지도 API v3 — 네이버 클라우드 플랫폼 Maps의 Client ID(ncpKeyId)로 불러온다.
// 키는 공개돼도 되는 값이고, 콘솔에 등록한 웹 서비스 URL에서만 동작한다.
const KEY = import.meta.env.VITE_NAVER_MAP_KEY;

let sdkPromise = null;
function loadSdk() {
  sdkPromise ??= new Promise((resolve, reject) => {
    if (window.naver?.maps) return resolve(window.naver.maps);
    const s = document.createElement('script');
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(KEY)}`;
    s.async = true;
    s.onload = () => (window.naver?.maps ? resolve(window.naver.maps) : reject(new Error('naver maps')));
    s.onerror = () => { sdkPromise = null; reject(new Error('naver maps')); };
    // 인증 실패(키·URL 미등록) 때 네이버가 부르는 전역 함수
    window.navermap_authFailure = () => reject(new Error('auth'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function pinHtml(active) {
  return `<span class="cafe-pin${active ? ' is-active' : ''}"></span>`;
}

/** LeafletMap과 같은 props: cafes, selectedId, onSelect, pick, onPick, focus, fitToCafes, className */
export default function NaverMap({ cafes = [], selectedId, onSelect, pick, onPick, focus, className, fitToCafes = true }) {
  const box = useRef(null);
  const nm = useRef(null); // naver.maps 네임스페이스
  const map = useRef(null);
  const markers = useRef([]);
  const pickMarker = useRef(null);
  const fittedFor = useRef(null);
  const handlers = useRef({});
  handlers.current = { onSelect, onPick };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // 지도 만들기 (한 번)
  useEffect(() => {
    let alive = true;
    let ro;
    loadSdk().then((maps) => {
      if (!alive) return;
      nm.current = maps;
      const [[s, w], [n, e]] = KOREA_BOUNDS;
      const m = new maps.Map(box.current, {
        center: new maps.LatLng(36.4, 127.8),
        zoom: 7,
        minZoom: 6,
        zoomControl: true,
        zoomControlOptions: { position: maps.Position.TOP_LEFT, style: maps.ZoomControlStyle.SMALL },
        mapDataControl: false,
        scaleControl: false,
        logoControlOptions: { position: maps.Position.BOTTOM_RIGHT },
        maxBounds: new maps.LatLngBounds(new maps.LatLng(30.5, 121), new maps.LatLng(40.5, 134)),
      });
      m.fitBounds(new maps.LatLngBounds(new maps.LatLng(s, w), new maps.LatLng(n, e)));
      maps.Event.addListener(m, 'click', (ev) => handlers.current.onPick?.({ lat: ev.coord.lat(), lng: ev.coord.lng() }));
      map.current = m;
      ro = new ResizeObserver(() => {
        const el = box.current;
        if (el) m.setSize(new maps.Size(el.clientWidth, el.clientHeight));
      });
      ro.observe(box.current);
      setReady(true);
    }).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      ro?.disconnect();
      map.current?.destroy();
      map.current = null;
    };
  }, []);

  // 카페 핀
  useEffect(() => {
    const maps = nm.current;
    const m = map.current;
    if (!ready || !m) return;
    markers.current.forEach((mk) => mk.setMap(null));
    markers.current = cafes.map((c) => {
      const active = c.id === selectedId;
      const mk = new maps.Marker({
        position: new maps.LatLng(c.lat, c.lng),
        map: m,
        title: c.name,
        zIndex: active ? 1000 : 100,
        icon: { content: pinHtml(active), anchor: new maps.Point(15, 38) },
      });
      maps.Event.addListener(mk, 'click', () => handlers.current.onSelect?.(c));
      return mk;
    });
    if (fitToCafes && cafes.length && !focus && fittedFor.current !== cafes) {
      fittedFor.current = cafes;
      if (cafes.length === 1) {
        m.setCenter(new maps.LatLng(cafes[0].lat, cafes[0].lng));
        m.setZoom(15);
      } else {
        const b = new maps.LatLngBounds();
        cafes.forEach((c) => b.extend(new maps.LatLng(c.lat, c.lng)));
        m.fitBounds(b, { top: 40, right: 40, bottom: 40, left: 40 });
        if (m.getZoom() > 15) m.setZoom(15);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cafes, selectedId]);

  // 위치 고르기 핀 (끌어서 옮길 수 있음)
  useEffect(() => {
    const maps = nm.current;
    const m = map.current;
    if (!ready || !m) return;
    if (!pick) {
      pickMarker.current?.setMap(null);
      pickMarker.current = null;
      return;
    }
    const pos = new maps.LatLng(pick.lat, pick.lng);
    if (!pickMarker.current) {
      pickMarker.current = new maps.Marker({
        position: pos,
        map: m,
        draggable: true,
        zIndex: 2000,
        icon: { content: pinHtml(true), anchor: new maps.Point(15, 38) },
      });
      maps.Event.addListener(pickMarker.current, 'dragend', (ev) => {
        handlers.current.onPick?.({ lat: ev.coord.lat(), lng: ev.coord.lng() });
      });
    } else {
      pickMarker.current.setPosition(pos);
    }
  }, [ready, pick]);

  // 특정 위치로 이동
  useEffect(() => {
    const maps = nm.current;
    if (ready && focus && map.current) map.current.morph(new maps.LatLng(focus.lat, focus.lng), focus.zoom ?? 16);
  }, [ready, focus]);

  return (
    <div className={cx('cafe-map relative z-0 overflow-hidden rounded-[var(--radius-card)] border border-line', className)}>
      {/* 네이버 지도가 컨테이너에 position:relative를 넣으므로 inset 대신 크기로 채운다 */}
      <div ref={box} className="h-full w-full" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center bg-sunken p-6 text-center text-sm text-muted">
          네이버 지도를 불러오지 못했어요. 지도 키와 등록된 웹 서비스 주소를 확인해 주세요.
        </p>
      )}
    </div>
  );
}

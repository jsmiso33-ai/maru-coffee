import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KOREA_BOUNDS } from '../data/cafes.js';
import { cx } from './ui.jsx';

// 지도 바탕: OpenStreetMap 기본 타일 — 키 없이 쓰고 출처 표기 필수(한글 지명 표시).
// 사이트 색감에 맞춰 CSS(.cafe-map .leaflet-tile-pane)로 채도를 낮춘다.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// 이미지 대신 HTML 핀 — 번들러 경로 문제 없고 브랜드 색을 쓸 수 있다
function pinIcon({ active = false, wish = false, label } = {}) {
  return L.divIcon({
    className: 'cafe-pin-wrap',
    html: `<span class="cafe-pin${active ? ' is-active' : ''}${wish ? ' is-wish' : ''}">${label ? `<b>${label}</b>` : ''}</span>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
  });
}

/**
 * cafes      : 지도에 찍을 카페들 (보기 모드)
 * selectedId : 강조할 카페
 * onSelect   : 핀을 눌렀을 때
 * pick       : { lat, lng } | null — 위치 고르기 모드의 현재 핀
 * onPick     : 지도를 눌러 위치를 고를 때 ({ lat, lng })
 * focus      : { lat, lng, zoom } — 이 값이 바뀌면 그쪽으로 이동
 */
export default function CafeMap({ cafes = [], selectedId, onSelect, pick, onPick, focus, className, fitToCafes = true }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pickMarker = useRef(null);
  const fittedFor = useRef(null);
  const handlers = useRef({});
  handlers.current = { onSelect, onPick };

  // 지도 만들기 (한 번)
  useEffect(() => {
    const m = L.map(box.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // 페이지 스크롤을 지도가 가로채지 않게 — 클릭하면 켬
      maxBounds: [[30.5, 121], [40.5, 134]],
      minZoom: 6,
    }).fitBounds(KOREA_BOUNDS);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
    m.on('click', (e) => {
      m.scrollWheelZoom.enable();
      handlers.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // 레이아웃이 자리 잡은 뒤 크기 재계산 (lazy 로딩·탭 전환 직후 회색 칸 방지)
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // 카페 핀
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    const points = [];
    for (const c of cafes) {
      const active = c.id === selectedId;
      const marker = L.marker([c.lat, c.lng], {
        icon: pinIcon({ active, wish: c.reviewCount === 0 }),
        title: c.name,
        alt: c.name,
        keyboard: true,
        zIndexOffset: active ? 1000 : 0,
        riseOnHover: true,
      });
      marker.bindTooltip(c.name, { direction: 'top', offset: [0, -34], className: 'cafe-tooltip' });
      marker.on('click', () => handlers.current.onSelect?.(c));
      marker.addTo(layer.current);
      points.push([c.lat, c.lng]);
    }
    // 화면 맞춤은 카페 목록(필터)이 바뀔 때만 — 핀을 골랐다고 지도가 튀지 않게
    if (fitToCafes && points.length && !focus && fittedFor.current !== cafes) {
      fittedFor.current = cafes;
      if (points.length === 1) m.setView(points[0], 14);
      else m.fitBounds(points, { padding: [36, 36], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafes, selectedId]);

  // 위치 고르기 핀
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pick) {
      pickMarker.current?.remove();
      pickMarker.current = null;
      return;
    }
    if (!pickMarker.current) {
      pickMarker.current = L.marker([pick.lat, pick.lng], { icon: pinIcon({ active: true }), draggable: true, autoPan: true }).addTo(m);
      pickMarker.current.on('dragend', (e) => {
        const p = e.target.getLatLng();
        handlers.current.onPick?.({ lat: p.lat, lng: p.lng });
      });
    } else {
      pickMarker.current.setLatLng([pick.lat, pick.lng]);
    }
  }, [pick]);

  // 특정 위치로 이동
  useEffect(() => {
    if (focus && map.current) map.current.flyTo([focus.lat, focus.lng], focus.zoom ?? 16, { duration: 0.6 });
  }, [focus]);

  return <div ref={box} className={cx('cafe-map z-0 overflow-hidden rounded-[var(--radius-card)] border border-line', className)} />;
}

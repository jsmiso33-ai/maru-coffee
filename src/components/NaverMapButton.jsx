import { naverMapUrl } from '../data/cafes.js';
import { cx } from './ui.jsx';

// 네이버 지도 앱·웹에서 이 카페 열기 (길찾기·영업시간·리뷰는 네이버에서)
export default function NaverMapButton({ cafe, className }) {
  return (
    <a
      href={naverMapUrl(cafe)}
      target="_blank"
      rel="noreferrer"
      className={cx('inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#03C75A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#02b350] sm:h-9', className)}
    >
      <span aria-hidden className="grid size-4 place-items-center rounded-[3px] bg-white text-[0.7rem] font-black leading-none text-[#03C75A]">N</span>
      네이버 지도
    </a>
  );
}

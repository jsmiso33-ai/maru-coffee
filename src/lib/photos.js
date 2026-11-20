import { supabase } from './supabase.js';

// 부원 사진(노트·카페 후기) — Storage 'photos' 버킷, 경로는 {user_id}/{uuid}.jpg
const BUCKET = 'photos';
export const MAX_PHOTOS = 3;

export function photoUrl(path) {
  if (!supabase || !path) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// 휴대폰 사진은 크고 위치(EXIF)가 들어 있어서, 화면에 맞게 줄여 JPEG로 다시 저장한다
async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('이 사진을 읽을 수 없어요. JPG·PNG·HEIC 사진을 골라 주세요.'); }
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('사진을 처리하지 못했어요. 다른 사진으로 시도해 주세요.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadPhoto(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요.');
  const blob = await compress(file);
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error('사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  return path;
}

// 글을 지우거나 사진을 뺄 때 파일도 정리 (실패해도 글 작업은 막지 않는다)
export async function removePhotos(paths) {
  const list = (paths ?? []).filter(Boolean);
  if (!supabase || !list.length) return;
  try { await supabase.storage.from(BUCKET).remove(list); } catch { /* 고아 파일로 남아도 무방 */ }
}

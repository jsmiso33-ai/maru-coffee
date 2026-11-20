import { supabase } from './supabase.js';

export const PAGE_SIZE = 24;
const bucket = supabase?.storage.from('gallery');

export async function listPhotos(page) {
  if (!supabase) return [];
  const start = page * PAGE_SIZE;
  const { data, error } = await supabase.from('gallery_photos').select('name, caption, created_at')
    .order('created_at', { ascending: false }).order('name').range(start, start + PAGE_SIZE);
  if (error) throw error;
  return data.map((photo) => ({ ...photo, url: bucket.getPublicUrl(photo.name).data.publicUrl }));
}

export async function publishPhoto(file, caption) {
  // Re-encode the displayed image to keep mobile downloads small and omit EXIF location data.
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    try { await image.decode(); } catch { throw new Error('이 사진을 읽을 수 없어요. JPG, PNG 또는 WebP 파일을 골라 주세요.'); }
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('사진을 처리할 수 없어요. 더 작은 파일로 시도해 주세요.');
    const { error } = await bucket.upload(`${crypto.randomUUID()}.jpg`, blob, { metadata: { caption } });
    if (error) throw error;
  } finally { URL.revokeObjectURL(url); }
}

export async function removePhoto(name) {
  const { error } = await bucket.remove([name]);
  if (error) throw error;
}

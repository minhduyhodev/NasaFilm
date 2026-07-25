/** Compress images before support upload to cut Cloudinary + vision latency. */
export async function compressSupportImage(file, { maxEdge = 1600, quality = 0.82 } = {}) {
  if (!file || !`${file.type || ''}`.startsWith('image/')) return file;
  // Skip tiny files / GIFs (animation) / already-small payloads.
  if (`${file.type}`.includes('gif') || file.size < 350_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob || blob.size >= file.size) return file;

    const base = (file.name || 'screenshot').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressSupportImages(files) {
  const list = Array.from(files || []).filter(Boolean);
  return Promise.all(list.map((file) => compressSupportImage(file)));
}

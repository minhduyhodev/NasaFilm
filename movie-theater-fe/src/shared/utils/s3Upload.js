import { movieService } from '../services/movieService';

/** Đồng bộ ngưỡng multipart mặc định BE (20MB). FE tự quyết định; BE không đọc config này. */
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024;

const guessContentType = (file, folder) => {
  if (file?.type) return file.type;
  if (folder === 'poster') return 'image/jpeg';
  if (folder === 'trailer' || folder === 'movie') return 'video/mp4';
  return 'application/octet-stream';
};

const putBlob = async (url, blob, contentType) => {
  const response = await fetch(url, {
    method: 'PUT',
    body: blob,
    headers: contentType ? { 'Content-Type': contentType } : undefined,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload S3 thất bại (${response.status}): ${text.slice(0, 200)}`);
  }
  return response;
};

const uploadSinglePut = async ({ folder, file, contentType, movieTitle, onProgress }) => {
  const plan = await movieService.presignS3Put({
    folder,
    fileName: file.name,
    contentType,
    movieTitle,
  });
  onProgress?.(5);
  await putBlob(plan.url, file, contentType);
  onProgress?.(100);
  return plan.key;
};

const uploadMultipart = async ({ folder, file, contentType, movieTitle, onProgress }) => {
  const init = await movieService.initiateS3Multipart({
    folder,
    fileName: file.name,
    contentType,
    movieTitle,
  });
  const partSize = Number(init.partSizeBytes) || 16 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));
  const parts = [];

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);
      const signed = await movieService.signS3MultipartPart({
        key: init.key,
        uploadId: init.uploadId,
        partNumber,
      });
      const response = await putBlob(signed.url, blob);
      const eTag = response.headers.get('ETag') || response.headers.get('etag');
      if (!eTag) {
        throw new Error(
          'Thiếu ETag từ S3. Cần cấu hình CORS bucket ExposeHeaders = ETag.'
        );
      }
      parts.push({
        partNumber,
        eTag: eTag.replace(/"/g, ''),
      });
      onProgress?.(Math.round((partNumber / totalParts) * 100));
    }

    await movieService.completeS3Multipart({
      key: init.key,
      uploadId: init.uploadId,
      parts,
    });
    return init.key;
  } catch (error) {
    try {
      await movieService.abortS3Multipart({
        key: init.key,
        uploadId: init.uploadId,
      });
    } catch {
      // ignore abort errors
    }
    throw error;
  }
};

/**
 * Upload file local lên S3, trả về key (vd: movie/xxx.mp4).
 * File &lt; 20MB: PUT một lần. File lớn: multipart.
 */
export const uploadMediaToS3 = async (folder, file, { movieTitle, onProgress } = {}) => {
  if (!file) {
    throw new Error('Chưa chọn file');
  }
  if (!movieTitle?.trim()) {
    throw new Error('Nhập Tên phim trước khi upload — file S3 sẽ đặt theo tên phim');
  }
  if (!['poster', 'trailer', 'movie'].includes(folder)) {
    throw new Error('folder không hợp lệ');
  }

  const contentType = guessContentType(file, folder);
  const title = movieTitle.trim();
  onProgress?.(1);

  if (file.size < MULTIPART_THRESHOLD_BYTES) {
    return uploadSinglePut({ folder, file, contentType, movieTitle: title, onProgress });
  }
  return uploadMultipart({ folder, file, contentType, movieTitle: title, onProgress });
};

import { movieService } from '../services/movieService';

/** Đồng bộ ngưỡng multipart mặc định BE (20MB). FE tự quyết định; BE không đọc config này. */
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024;

/** Số part upload song song — cân bằng tốc độ / ổn định mạng. */
const MULTIPART_CONCURRENCY = 4;

const guessContentType = (file, folder) => {
  if (file?.type) return file.type;
  if (folder === 'poster') return 'image/jpeg';
  if (folder === 'trailer' || folder === 'movie') return 'video/mp4';
  return 'application/octet-stream';
};

const clampPercent = (value) => Math.min(99, Math.max(0, Math.round(value)));

/**
 * PUT lên S3 bằng XHR để có upload progress theo byte (fetch không hỗ trợ).
 * @returns {{ status: number, headers: { get: (name: string) => string | null } }}
 */
const putBlobWithProgress = (url, blob, contentType, onBytes) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (contentType) {
      xhr.setRequestHeader('Content-Type', contentType);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onBytes?.(event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          status: xhr.status,
          headers: {
            get: (name) => xhr.getResponseHeader(name),
          },
        });
        return;
      }
      const text = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      reject(new Error(`Upload S3 thất bại (${xhr.status}): ${text.slice(0, 200)}`));
    };

    xhr.onerror = () => {
      reject(new Error('Upload S3 thất bại (mạng / CORS). Kiểm tra kết nối và CORS bucket.'));
    };
    xhr.onabort = () => {
      reject(new Error('Upload S3 đã bị hủy'));
    };

    xhr.send(blob);
  });

const uploadSinglePut = async ({ folder, file, contentType, movieTitle, onProgress }) => {
  onProgress?.(2);
  const plan = await movieService.presignS3Put({
    folder,
    fileName: file.name,
    contentType,
    movieTitle,
  });
  onProgress?.(4);

  await putBlobWithProgress(plan.url, file, contentType, (loaded, total) => {
    const ratio = total > 0 ? loaded / total : 0;
    // 4–99% trong lúc đẩy byte; 100% sau khi xong.
    onProgress?.(clampPercent(4 + ratio * 95));
  });

  onProgress?.(100);
  return plan.key;
};

/**
 * Chạy tối đa `limit` task song song từ danh sách async factories.
 */
const runWithConcurrency = async (factories, limit) => {
  const results = new Array(factories.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, factories.length) }, async () => {
    while (nextIndex < factories.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await factories[index]();
    }
  });

  await Promise.all(workers);
  return results;
};

const uploadMultipart = async ({ folder, file, contentType, movieTitle, onProgress }) => {
  onProgress?.(2);
  const init = await movieService.initiateS3Multipart({
    folder,
    fileName: file.name,
    contentType,
    movieTitle,
  });
  onProgress?.(4);

  const partSize = Number(init.partSizeBytes) || 16 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));
  const partLoaded = new Array(totalParts).fill(0);
  const partSizes = new Array(totalParts);

  for (let i = 0; i < totalParts; i += 1) {
    const start = i * partSize;
    const end = Math.min(start + partSize, file.size);
    partSizes[i] = end - start;
  }

  const reportProgress = () => {
    const uploaded = partLoaded.reduce((sum, n) => sum + n, 0);
    const ratio = file.size > 0 ? uploaded / file.size : 0;
    onProgress?.(clampPercent(4 + ratio * 94));
  };

  try {
    const factories = Array.from({ length: totalParts }, (_, index) => async () => {
      const partNumber = index + 1;
      const start = index * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);

      const signed = await movieService.signS3MultipartPart({
        key: init.key,
        uploadId: init.uploadId,
        partNumber,
      });

      const response = await putBlobWithProgress(signed.url, blob, undefined, (loaded) => {
        partLoaded[index] = Math.min(loaded, partSizes[index]);
        reportProgress();
      });

      partLoaded[index] = partSizes[index];
      reportProgress();

      const eTag = response.headers.get('ETag') || response.headers.get('etag');
      if (!eTag) {
        throw new Error(
          'Thiếu ETag từ S3. Cần cấu hình CORS bucket ExposeHeaders = ETag.'
        );
      }

      return {
        partNumber,
        eTag: eTag.replace(/"/g, ''),
      };
    });

    const parts = await runWithConcurrency(factories, MULTIPART_CONCURRENCY);
    onProgress?.(98);

    await movieService.completeS3Multipart({
      key: init.key,
      uploadId: init.uploadId,
      parts,
    });

    onProgress?.(100);
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
 * File &lt; 20MB: PUT một lần. File lớn: multipart song song (4 part).
 * onProgress nhận % 0–100 theo byte đã đẩy.
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

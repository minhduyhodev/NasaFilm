import { resolveMediaUrl, handlePosterError, unwrapMediaUrl } from '../utils/mediaUrlUtils';
import { useMediaUrlRouting } from '../hooks/useMediaUrlRouting';

/**
 * Poster TMDB qua CDN/proxy — dùng thay cho <img src={rawUrl}>.
 */
const PosterImage = ({
  src,
  alt = '',
  width = 400,
  className = '',
  loading = 'lazy',
  onError,
  ...rest
}) => {
  useMediaUrlRouting();

  const raw = unwrapMediaUrl(src?.trim() || '');
  if (!raw) {
    return null;
  }

  return (
    <img
      src={resolveMediaUrl(raw, width)}
      data-original-url={raw}
      data-width={width}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={(event) => {
        handlePosterError(event);
        onError?.(event);
      }}
      {...rest}
    />
  );
};

export default PosterImage;

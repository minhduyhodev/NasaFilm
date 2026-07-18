import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import './SupportMessageImages.css';

const SupportMessageImages = ({ urls = [], compact = false }) => {
  const images = (Array.isArray(urls) ? urls : []).filter(Boolean);
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    if (viewerIndex == null) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setViewerIndex(null);
        return;
      }
      if (event.key === 'ArrowLeft') {
        setViewerIndex((prev) => (prev == null ? prev : (prev - 1 + images.length) % images.length));
        return;
      }
      if (event.key === 'ArrowRight') {
        setViewerIndex((prev) => (prev == null ? prev : (prev + 1) % images.length));
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [viewerIndex, images.length]);

  if (images.length === 0) return null;

  const activeUrl = viewerIndex != null ? images[viewerIndex] : null;

  return (
    <>
      <div className={`support-msg-images${compact ? ' support-msg-images--compact' : ''}`}>
        {images.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            className="support-msg-images__item"
            onClick={() => setViewerIndex(index)}
            aria-label={`Xem ảnh ${index + 1}`}
          >
            <img src={url} alt={`Ảnh đính kèm hỗ trợ ${index + 1}`} loading="lazy" />
          </button>
        ))}
      </div>

      {activeUrl && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="support-image-viewer"
              role="dialog"
              aria-modal="true"
              aria-label="Xem ảnh hỗ trợ"
              onClick={() => setViewerIndex(null)}
            >
              <button
                type="button"
                className="support-image-viewer__close"
                onClick={() => setViewerIndex(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="support-image-viewer__nav support-image-viewer__nav--prev"
                    onClick={(event) => {
                      event.stopPropagation();
                      setViewerIndex((prev) => (prev - 1 + images.length) % images.length);
                    }}
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    className="support-image-viewer__nav support-image-viewer__nav--next"
                    onClick={(event) => {
                      event.stopPropagation();
                      setViewerIndex((prev) => (prev + 1) % images.length);
                    }}
                    aria-label="Ảnh sau"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              ) : null}

              <div
                className="support-image-viewer__stage"
                onClick={(event) => event.stopPropagation()}
              >
                <img src={activeUrl} alt={`Ảnh hỗ trợ ${viewerIndex + 1}`} />
                {images.length > 1 ? (
                  <div className="support-image-viewer__counter">
                    {viewerIndex + 1} / {images.length}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default SupportMessageImages;

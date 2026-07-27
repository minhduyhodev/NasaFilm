import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, Loader2 } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrlUtils';

const getEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return url;
};

const TrailerModal = ({ open, onClose, title, trailerUrl, isLoading = false }) => {
  const playableUrl = useMemo(() => {
    if (!trailerUrl?.trim()) return '';
    // YouTube giữ nguyên; S3 trailer → /api/media/stream (công khai, không cần vé).
    if (trailerUrl.includes('youtube.com') || trailerUrl.includes('youtu.be')) {
      return trailerUrl.trim();
    }
    return resolveMediaUrl(trailerUrl) || trailerUrl.trim();
  }, [trailerUrl]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isYouTube = playableUrl?.includes('youtube.com') || playableUrl?.includes('youtu.be');
  const embedUrl = isYouTube ? getEmbedUrl(playableUrl) : playableUrl;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <button
          type="button"
          className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50 bg-black/70 p-2 rounded-full"
          onClick={onClose}
          aria-label="Đóng trailer"
        >
          <X className="h-6 w-6" />
        </button>

        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
            <Loader2 className="h-12 w-12 text-red-500 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Đang tải trailer...</p>
          </div>
        ) : playableUrl ? (
          isYouTube ? (
            <iframe
              src={embedUrl}
              title={`${title || 'Phim'} Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={playableUrl} controls autoPlay className="w-full h-full object-contain" />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
            <Play className="text-red-500 h-16 w-16 mb-4 animate-pulse fill-current" />
            <h2 className="text-2xl font-black text-white uppercase">Chưa có Trailer</h2>
            <p className="text-gray-400 mt-2 text-sm">
              Trailer của {title || 'phim này'} đang được cập nhật.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TrailerModal;

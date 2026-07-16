import { useCallback, useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const ShareButton = ({ title, text, url, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleShare = useCallback(async () => {
    const payload = {
      title: title || 'NASAFILM',
      text: text || title || 'Xem phim trên NASAFILM',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notificationService.success('Đã sao chép liên kết');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notificationService.error('Không thể chia sẻ liên kết');
    }
  }, [shareUrl, text, title]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white transition-colors ${className}`}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      <span className="text-xs font-bold uppercase tracking-wide">Chia sẻ</span>
      {!navigator.share && <Link2 className="w-3 h-3 opacity-50" />}
    </button>
  );
};

export default ShareButton;

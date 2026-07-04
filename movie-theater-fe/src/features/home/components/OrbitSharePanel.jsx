import React from 'react';
import { Share2, Copy } from 'lucide-react';

const OrbitSharePanel = ({ sharePath, onCopyLink }) => (
  <div className="orbit-booking__panel p-5">
    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
      <Share2 className="w-3.5 h-3.5" />
      Mời bạn bè
    </h3>
    <p className="orbit-booking__share mb-3">{sharePath}</p>
    <button
      type="button"
      onClick={onCopyLink}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors"
    >
      <Copy className="w-4 h-4" />
      Sao chép link
    </button>
  </div>
);

export default React.memo(OrbitSharePanel);

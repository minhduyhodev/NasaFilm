import React from 'react';
import { Share2, Copy, Ticket } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';

const OrbitSharePanel = ({ sharePath, onCopyLink }) => {
  const uuid = sharePath?.split('/').pop() || '';
  const roomCode = uuid ? uuid.substring(0, 8).toUpperCase() : '';

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      notificationService.success('Đã sao chép mã phòng Orbit!');
    } catch {
      notificationService.info(roomCode);
    }
  };

  return (
    <div className="orbit-booking__panel p-5 space-y-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
        <Share2 className="w-3.5 h-3.5" />
        Mời bạn bè tham gia
      </h3>

      {/* Box hiển thị mã phòng Orbit nổi bật */}
      <div className="bg-[#0b0f19]/60 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mã phòng Orbit</span>
        <span className="text-2xl font-black text-red-500 tracking-wider mt-1 select-all">{roomCode || '-------'}</span>
        <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
          Thành viên có thể nhập mã này hoặc truy cập đường link để vào phòng chọn ghế.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Ticket className="w-3.5 h-3.5 text-red-400" />
          Sao chép mã
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
          Sao chép link
        </button>
      </div>
    </div>
  );
};

export default React.memo(OrbitSharePanel);

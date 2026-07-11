import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link, Loader2 } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { orbitService } from '../../../shared/services/orbitService';

const OrbitJoinInput = () => {
  const [linkInput, setLinkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    const input = linkInput.trim();
    if (!input) {
      notificationService.error('Vui lòng nhập mã phòng hoặc dán link Orbit để tham gia.');
      return;
    }

    setLoading(true);
    try {
      let code = input;
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const match = input.match(uuidRegex);
      if (match) {
        code = match[0];
      } else {
        const parts = input.split('/');
        const lastPart = parts[parts.length - 1]?.trim();
        if (lastPart) {
          code = lastPart;
        }
      }

      const res = await orbitService.resolveRoomCode(code);
      if (res && res.roomUuid) {
        navigate(`/booking/orbit/${res.roomUuid}`);
      } else {
        notificationService.error('Không tìm thấy phòng Orbit.');
      }
    } catch (err) {
      notificationService.error(err.message || 'Mã phòng hoặc đường dẫn Orbit không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="orbit-join-bar flex items-center gap-2 bg-[#1f2937]/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 max-w-md w-full shadow-lg">
      <div className="flex items-center gap-2 pl-2 text-zinc-500 shrink-0">
        <Link className="w-3.5 h-3.5" />
      </div>
      <input
        type="text"
        placeholder="Nhập mã (8 ký tự) hoặc dán link phòng để tham gia..."
        value={linkInput}
        onChange={(e) => setLinkInput(e.target.value)}
        disabled={loading}
        className="flex-grow bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <span>Tham gia</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
};

export default OrbitJoinInput;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';

const OrbitJoinInput = () => {
  const [linkInput, setLinkInput] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    const input = linkInput.trim();
    if (!input) return;

    // Match UUID v4
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = input.match(uuidRegex);

    if (match) {
      const roomUuid = match[0];
      navigate(`/booking/orbit/${roomUuid}`);
    } else {
      notificationService.error('Mã phòng hoặc đường dẫn Orbit không hợp lệ.');
    }
  };

  return (
    <form onSubmit={handleJoin} className="orbit-join-bar flex items-center gap-2 bg-[#1f2937]/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 max-w-md w-full shadow-lg">
      <div className="flex items-center gap-2 pl-2 text-zinc-500 shrink-0">
        <Link className="w-3.5 h-3.5" />
      </div>
      <input
        type="text"
        placeholder="Nhập mã hoặc dán link phòng Orbit để tham gia..."
        value={linkInput}
        onChange={(e) => setLinkInput(e.target.value)}
        className="flex-grow bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
      />
      <button
        type="submit"
        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
      >
        <span>Tham gia</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </form>
  );
};

export default OrbitJoinInput;

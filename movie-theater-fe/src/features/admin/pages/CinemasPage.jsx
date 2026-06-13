import React from 'react';
import { MapPin, SlidersHorizontal, Download, Search, Edit2, Trash2, Crown, Tv, Activity } from 'lucide-react';
import './CinemasPage.css';

const CinemasPage = () => {
  const cinemas = [
    {
      name: 'Downtown Plaza',
      desc: 'Quận 7, Trung tâm thành phố',
      screens: 12,
      vip: 3,
      occupancy: 92,
      revenueToday: '$45,240',
      status: 'Open',
    },
    {
      name: 'Riverfront Mall',
      desc: 'Bờ Đông, Phân khu A',
      screens: 8,
      vip: 2,
      occupancy: 79,
      revenueToday: '$32,150',
      status: 'Open',
    },
    {
      name: 'North Point Galaxy',
      desc: 'Phía Bắc Heights, Khu dân cư',
      screens: 16,
      vip: 4,
      occupancy: 64,
      revenueToday: '$18,900',
      status: 'Closed',
    },
  ];

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Hệ Thống Chi Nhánh Rạp</h1>
          <p className="text-xs text-gray-400 mt-1">
            Tổng chi nhánh: <span className="text-white font-bold">14</span> · 
            Phòng chiếu: <span className="text-white font-bold">78</span> · 
            Phòng VIP: <span className="text-amber-400 font-bold">12</span> · 
            Mở cửa hôm nay: <span className="text-emerald-400 font-bold">11</span>
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer">
          Thêm Rạp Chiếu Mới
        </button>
      </div>

      <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border-b border-[#1A2238]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tìm kiếm rạp theo tên, địa chỉ..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-[11px] text-gray-300 font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Bộ lọc
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-[11px] text-gray-300 font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Xuất file
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                <th className="py-2.5 px-4 text-left">Tên Rạp / Địa Chỉ</th>
                <th className="py-2.5 px-4 text-center">Hiệu suất lấp đầy</th>
                <th className="py-2.5 px-4 text-center">Doanh thu hôm nay</th>
                <th className="py-2.5 px-4 text-center">Quy mô phòng</th>
                <th className="py-2.5 px-4 text-center">Trạng thái</th>
                <th className="py-2.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2238]/40">
              {cinemas.map((row) => (
                <tr key={row.name} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle group">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#1A2238]/60 border border-[#1A2238] text-rose-500 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-sm leading-tight">{row.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{row.desc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1 min-w-[120px] mx-auto">
                      <div className="flex justify-between w-full text-[10px] font-semibold text-gray-300">
                        <span>Lấp đầy</span>
                        <span className={row.occupancy >= 85 ? 'text-rose-400' : 'text-gray-400'}>{row.occupancy}%</span>
                      </div>
                      <div className="w-full bg-[#070A13] border border-[#1A2238] rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${row.occupancy >= 80 ? 'bg-rose-500' : 'bg-gray-400'}`} style={{ width: `${row.occupancy}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center text-amber-500 font-mono font-bold">
                    {row.revenueToday}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex flex-col items-center leading-tight text-gray-300">
                      <span className="font-bold">{row.screens} phòng chiếu</span>
                      <span className="text-[10px] text-gray-500 font-medium">({row.vip} VIP)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      row.status === 'Open' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                    }`}>
                      {row.status === 'Open' ? '🟢 MỞ CỬA' : '🔴 ĐÓNG CỬA'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="inline-flex items-center justify-center rounded border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[11px] font-bold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/30 transition duration-150 cursor-pointer" title="Sửa">
                        Sửa
                      </button>
                      <button className="inline-flex items-center justify-center rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition duration-150 cursor-pointer" title="Xóa">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default CinemasPage;

import React from 'react';
import { MapPin, SlidersHorizontal, Download, Search, Edit2, Trash2, Crown, Tv, Activity } from 'lucide-react';
import './CinemasPage.css';

const CinemasPage = () => {
  const cards = [
    {
      label: 'CHI NHÁNH',
      value: '14',
      sub: 'Đang hoạt động',
      Icon: MapPin,
      color: 'text-rose-500',
    },
    {
      label: 'PHÒNG CHIẾU',
      value: '78',
      sub: 'Tổng số phòng toàn cầu',
      Icon: Tv,
      color: 'text-emerald-500',
    },
    {
      label: 'PHÒNG VIP',
      value: '12',
      sub: 'Ghế ngồi cao cấp',
      Icon: Crown,
      color: 'text-amber-500',
    },
    {
      label: 'MỞ CỬA HÔM NAY',
      value: '11',
      sub: 'Trung tâm trực tuyến',
      Icon: Activity,
      color: 'text-sky-500',
    },
  ];

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
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">NASAFilm Network Hub</p>
          <h1 className="admin-title">Hệ Thống Chi Nhánh Rạp</h1>
          <p className="admin-description">
            Quản lý các chi nhánh rạp, số lượng phòng chiếu, doanh thu hôm nay và trạng thái lấp đầy phòng chiếu theo thời gian thực.
          </p>
        </div>
        <button className="admin-add-btn">
          <span className="admin-add-btn-plus">+</span>
          <div className="admin-add-btn-label-group">
            <div className="admin-add-btn-sub">Thêm mới</div>
            <div className="admin-add-btn-main">Rạp chiếu</div>
          </div>
        </button>
      </div>

      {/* Unified Stats Insight Panel (No-Card Layout, reduced by 60% clutter) */}
      <div className="dashboard-unified-stats-panel bg-[#121826]/70 border border-[#1A2238] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 divide-y md:divide-y-0 md:divide-x divide-[#1A2238] shadow-2xl backdrop-blur-md mb-8">
        {cards.map((card) => (
          <div key={card.label} className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">{card.label}</span>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mt-1">{card.value}</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {card.sub}
              </p>
            </div>
            <div className={`p-3.5 rounded-xl bg-white/5 border border-white/5 ${card.color} shrink-0`}>
              <card.Icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <Search className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Tìm kiếm rạp theo tên, địa chỉ hoặc sức chứa..."
            />
          </div>
          <div className="admin-action-group">
            <button className="admin-action-btn">
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
            <button className="admin-action-btn">
              <Download className="w-4 h-4" />
              Xuất file
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-thead-tr">
                <th className="pb-3 text-left">Tên Rạp / Địa Chỉ</th>
                <th className="pb-3 text-center">Hiệu suất lấp đầy</th>
                <th className="pb-3 text-center">Doanh thu hôm nay</th>
                <th className="pb-3 text-center">Quy mô phòng</th>
                <th className="pb-3 text-center">Trạng thái</th>
                <th className="pb-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cinemas.map((row) => (
                <tr key={row.name} className="admin-table-tr">
                  <td className="admin-table-td-cinema py-4">
                    <div className="flex items-center gap-3">
                      <div className="admin-cinema-icon-wrapper p-3 rounded-xl bg-[#1A2238]/60 border border-[#1A2238] text-rose-500">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-base">{row.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{row.desc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 min-w-[120px] mx-auto">
                      <div className="flex justify-between w-full text-xs font-semibold text-gray-300">
                        <span>Lấp đầy</span>
                        <span className={row.occupancy >= 85 ? 'text-rose-400' : 'text-gray-400'}>{row.occupancy}%</span>
                      </div>
                      <div className="w-full bg-[#0B1020] border border-[#1A2238] rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${row.occupancy >= 80 ? 'bg-rose-500' : 'bg-gray-400'}`} style={{ width: `${row.occupancy}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-center text-amber-500 font-mono font-bold text-sm">
                    {row.revenueToday}
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center gap-0.5 text-xs text-gray-300">
                      <span className="font-bold">{row.screens} phòng chiếu</span>
                      <span className="text-[10px] text-gray-500">({row.vip} VIP)</span>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      row.status === 'Open' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400'
                    }`}>
                      {row.status === 'Open' ? '🟢 MỞ CỬA' : '🔴 ĐÓNG CỬA'}
                    </span>
                  </td>
                  <td className="text-center py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button className="admin-btn-action-edit" title="Sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="admin-btn-action-delete" title="Xóa">
                        <Trash2 className="w-4 h-4" />
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

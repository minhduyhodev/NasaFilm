import React from 'react';
import { MapPin, SlidersHorizontal, Download, Search, Edit2, Trash2, Crown, Tv, Activity } from 'lucide-react';
import './CinemasPage.css';

const CinemasPage = () => {
  const cards = [
    {
      label: 'CHI NHÁNH',
      value: '14',
      sub: 'Đang hoạt động',
      isGreen: true,
      Icon: MapPin,
      color: 'text-indigo-500',
      bgIcon: 'text-indigo-500/10 group-hover:text-indigo-500/20 group-hover:scale-105',
    },
    {
      label: 'PHÒNG CHIẾU',
      value: '78',
      sub: 'Tổng số phòng',
      isGreen: false,
      Icon: Tv,
      color: 'text-emerald-500',
      bgIcon: 'text-emerald-500/10 group-hover:text-emerald-500/20 group-hover:scale-105',
    },
    {
      label: 'PHÒNG VIP',
      value: '12',
      sub: 'Ghế ngồi cao cấp',
      isGreen: false,
      isItalic: true,
      Icon: Crown,
      color: 'text-amber-500',
      bgIcon: 'text-amber-500/10 group-hover:text-amber-500/20 group-hover:scale-105',
    },
    {
      label: 'MỞ CỬA HÔM NAY',
      value: '11',
      sub: 'Đang mở cửa',
      isGreen: true,
      Icon: Activity,
      color: 'text-sky-500',
      bgIcon: 'text-sky-500/10 group-hover:text-sky-500/20 group-hover:scale-105',
    },
  ];

  const cinemas = [
    {
      name: 'Downtown Plaza',
      desc: 'District 7, Central Hub',
      screens: 12,
      vip: 3,
      status: 'Open',
    },
    {
      name: 'Riverfront Mall',
      desc: 'East Waterfront, Sector A',
      screens: 8,
      vip: 2,
      status: 'Open',
    },
    {
      name: 'North Point Galaxy',
      desc: 'Northern Heights, Residential',
      screens: 16,
      vip: 4,
      status: 'Closed',
    },
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">QUẢN LÝ RẠP CHIẾU</p>
          <h1 className="admin-title">Hệ Thống Chi Nhánh Rạp</h1>
          <p className="admin-description">
            Quản lý các chi nhánh rạp, số lượng phòng chiếu và trạng thái hoạt động trên toàn hệ thống. Tối ưu hóa hiệu suất thông qua giám sát chi tiết.
          </p>
        </div>
        <button className="admin-add-btn">
          <span className="admin-add-btn-plus">+</span>
          <div className="admin-add-btn-label-group">
            <div className="admin-add-btn-sub">Thêm</div>
            <div className="admin-add-btn-main">Rạp</div>
          </div>
        </button>
      </div>

      <div className="admin-stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="admin-stat-card group">
            {/* Watermark Icon */}
            <card.Icon className={`absolute -right-4 -top-4 w-20 h-20 transition-all duration-300 z-0 ${card.bgIcon}`} strokeWidth={1} />

            <div className="relative z-10 w-full">
              <div className="admin-stat-card-top">
                <p className="admin-stat-label">{card.label}</p>
                <card.Icon className={`w-5 h-5 ${card.color}`} strokeWidth={2} />
              </div>
              <h3 className="admin-stat-value mt-1">{card.value}</h3>
              <p className={`${card.isGreen ? 'admin-stat-badge-green' : 'admin-stat-badge-muted'} ${card.isItalic ? 'italic' : ''}`}>
                {card.sub}
              </p>
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
                <th className="pb-3">TÊN RẠP / ĐỊA CHỈ</th>
                <th className="pb-3 text-center">SỐ PHÒNG CHIẾU</th>
                <th className="pb-3 text-center">SỐ PHÒNG VIP</th>
                <th className="pb-3 text-center">TRẠNG THÁI</th>
                <th className="pb-3 text-center">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cinemas.map((row) => (
                <tr key={row.name} className="admin-table-tr">
                  <td className="admin-table-td-cinema">
                    <div className="admin-cinema-icon-wrapper">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="admin-cinema-name">{row.name}</div>
                      <div className="admin-cinema-desc">{row.desc}</div>
                    </div>
                  </td>
                  <td className="admin-table-td-val text-center">{row.screens}</td>
                  <td className="admin-table-td-val text-center">{row.vip}</td>
                  <td className="py-4 text-center">
                    <span className={`inline-flex ${row.status === 'Open' ? 'admin-badge-open' : 'admin-badge-closed'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${row.status === 'Open' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {row.status === 'Open' ? 'Mở cửa' : 'Đóng cửa'}
                    </span>
                  </td>
                  <td className="text-center py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button className="admin-btn-edit" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="admin-btn-delete" title="Delete">
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

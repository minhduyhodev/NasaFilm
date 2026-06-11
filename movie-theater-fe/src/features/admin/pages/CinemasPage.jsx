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
    },
    {
      label: 'PHÒNG CHIẾU',
      value: '78',
      sub: 'Tổng số phòng',
      isGreen: false,
      Icon: Tv,
    },
    {
      label: 'PHÒNG VIP',
      value: '12',
      sub: 'Ghế ngồi cao cấp',
      isGreen: false,
      isItalic: true,
      Icon: Crown,
    },
    {
      label: 'MỞ CỬA HÔM NAY',
      value: '11',
      sub: 'Đang mở cửa',
      isGreen: true,
      Icon: Activity,
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
            <card.Icon className="absolute -right-4 -top-4 w-20 h-20 text-white/5 group-hover:text-white/10 transition-colors duration-300" strokeWidth={1} />

            <div className="admin-stat-card-top">
              <p className="admin-stat-label">{card.label}</p>
              <card.Icon className="text-[#6e7191] w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="admin-stat-value">{card.value}</h3>
            <p className={`${card.isGreen ? 'admin-stat-badge-green' : 'admin-stat-badge-muted'} ${card.isItalic ? 'italic' : ''}`}>
              {card.sub}
            </p>
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
                <th className="pb-3">SỐ PHÒNG CHIẾU</th>
                <th className="pb-3">SỐ PHÒNG VIP</th>
                <th className="pb-3">TRẠNG THÁI</th>
                <th className="pb-3 text-right">HÀNH ĐỘNG</th>
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
                  <td className="admin-table-td-val">{row.screens}</td>
                  <td className="admin-table-td-val">{row.vip}</td>
                  <td className="py-4 pr-6">
                    <span className={row.status === 'Open' ? 'admin-badge-open' : 'admin-badge-closed'}>
                      {row.status === 'Open' ? 'Mở cửa' : 'Đóng cửa'}
                    </span>
                  </td>
                  <td className="admin-table-actions-td">
                    <div className="admin-table-actions-group">
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

import React from 'react';
import './DashboardPage.css';

const DashboardPage = () => {
  return (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-info">
          <h1 className="dashboard-title">Bảng Điều Khiển Admin</h1>
          <p className="dashboard-subtitle">Tổng quan vận hành & Phân tích</p>
        </div>
        <button className="dashboard-action-btn">
          <span className="material-symbols-outlined">add</span>
          Thêm Chiến Dịch Mới
        </button>
      </div>

      <div className="dashboard-stats-grid">
        {[
          { label: 'DOANH THU', value: '142,5K', badge: 'Tháng này', icon: 'analytics' },
          { label: 'TỶ LỆ CHUYỂN ĐỔI', value: '32,8%', badge: 'Tỷ lệ trung bình', icon: 'target' },
          { label: 'TĂNG TRƯỞNG', value: '+8,4%', badge: 'So với tháng trước', icon: 'trending_up' },
          { label: 'GIAO DỊCH', value: '3,480', badge: 'Đã hoàn thành', icon: 'analytics' },
        ].map((card) => (
          <div key={card.label} className="dashboard-stat-card">
            <div className="dashboard-stat-card-top">
              <span className="dashboard-stat-label">{card.label}</span>
              <span className="material-symbols-outlined dashboard-stat-icon">{card.icon}</span>
            </div>
            <div>
              <h3 className="dashboard-stat-value">{card.value}</h3>
              <p className="dashboard-stat-badge">{card.badge}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout-grid">
        <div className="dashboard-main-chart-card">
          <div className="dashboard-chart-header">
            <div>
              <h2 className="dashboard-chart-title">Tổng Quan Doanh Thu</h2>
              <p className="dashboard-chart-subtitle">Hiệu suất bán vé hàng ngày trên tất cả các rạp</p>
            </div>
            <div className="dashboard-chart-actions">
              <button className="dashboard-chart-btn-outline">Theo Ngày</button>
              <button className="dashboard-chart-btn-filled">Theo Tháng</button>
            </div>
          </div>
          <div className="dashboard-chart-wrapper">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <defs>
                <linearGradient id="chartGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(220, 38, 38, 0.24)" stopOpacity="1" />
                  <stop offset="100%" stopColor="rgba(220, 38, 38, 0)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,180 L0,120 C100,100 150,150 250,90 C350,30 400,100 500,60 C600,20 750,140 850,70 L1000,40 L1000,180 Z" fill="url(#chartGrad)" />
              <path d="M0,120 C100,100 150,150 250,90 C350,30 400,100 500,60 C600,20 750,140 850,70 L1000,40" fill="none" stroke="#ff8a7a" strokeWidth={4} />
            </svg>
          </div>
          {/* X Axis labels */}
          <div className="dashboard-chart-axis">
            <span>NGÀY 01</span>
            <span>NGÀY 10</span>
            <span>NGÀY 20</span>
            <span>NGÀY 30</span>
          </div>
        </div>

        <div className="dashboard-occupancy-card">
          <div className="dashboard-occupancy-header">
            <div>
              <h2 className="dashboard-occupancy-title">Tỷ Lệ Lấp Đầy Ghế</h2>
              <p className="dashboard-occupancy-subtitle">Hiệu suất sử dụng sức chứa theo thể loại</p>
            </div>
          </div>
          <div className="dashboard-occupancy-list">
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Viễn Tưởng / Hành Động</span>
                <span className="dashboard-occupancy-val-danger">92%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-danger" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Chính Kịch</span>
                <span className="dashboard-occupancy-val-muted">64%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-muted" style={{ width: '64%' }}></div>
              </div>
            </div>
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Kinh Dị</span>
                <span className="dashboard-occupancy-val-danger">88%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-danger" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Hoạt Hình</span>
                <span className="dashboard-occupancy-val-warning">79%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-warning" style={{ width: '79%' }}></div>
              </div>
            </div>
          </div>
          <button className="dashboard-occupancy-btn">Xem Phân Tích Chi Tiết</button>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;

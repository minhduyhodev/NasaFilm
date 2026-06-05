import React from 'react';
import './DashboardPage.css';

const DashboardPage = () => {
  return (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-info">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Operations & Analytics at a glance</p>
        </div>
        <button className="dashboard-action-btn">
          <span className="material-symbols-outlined">add</span>
          Add New Campaign
        </button>
      </div>

      <div className="dashboard-stats-grid">
        {[
          { label: 'REVENUE', value: '142,5K', badge: 'This month', icon: 'analytics' },
          { label: 'CONVERSATION', value: '32,8%', badge: 'Avg rate', icon: 'target' },
          { label: 'GROWTH', value: '+8,4%', badge: 'vs last month', icon: 'trending_up' },
          { label: 'TRANSACTIONS', value: '3,480', badge: 'Completed', icon: 'analytics' },
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
              <h2 className="dashboard-chart-title">Revenue Overview</h2>
              <p className="dashboard-chart-subtitle">Daily sales performance across all theaters</p>
            </div>
            <div className="dashboard-chart-actions">
              <button className="dashboard-chart-btn-outline">Daily</button>
              <button className="dashboard-chart-btn-filled">Monthly</button>
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
            <span>DAY 01</span>
            <span>DAY 10</span>
            <span>DAY 20</span>
            <span>DAY 30</span>
          </div>
        </div>

        <div className="dashboard-occupancy-card">
          <div className="dashboard-occupancy-header">
            <div>
              <h2 className="dashboard-occupancy-title">Occupancy Rate</h2>
              <p className="dashboard-occupancy-subtitle">Capacity usage per genre</p>
            </div>
          </div>
          <div className="dashboard-occupancy-list">
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Sci-Fi / Action</span>
                <span className="dashboard-occupancy-val-danger">92%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-danger" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Drama</span>
                <span className="dashboard-occupancy-val-muted">64%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-muted" style={{ width: '64%' }}></div>
              </div>
            </div>
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Horror</span>
                <span className="dashboard-occupancy-val-danger">88%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-danger" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div className="dashboard-occupancy-item">
              <div className="dashboard-occupancy-row">
                <span className="dashboard-occupancy-label">Animation</span>
                <span className="dashboard-occupancy-val-warning">79%</span>
              </div>
              <div className="dashboard-progress-bg">
                <div className="dashboard-progress-fill-warning" style={{ width: '79%' }}></div>
              </div>
            </div>
          </div>
          <button className="dashboard-occupancy-btn">View Detailed Breakdown</button>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;

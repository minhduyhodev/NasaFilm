import React from 'react';
import './AdminKpiGrid.css';

const GRID_CLASS = {
  3: 'admin-kpi-grid admin-kpi-grid--3',
  4: 'admin-kpi-grid admin-kpi-grid--4',
  5: 'admin-kpi-grid admin-kpi-grid--5',
};

/**
 * KPI summary cards — same layout as admin/movies (label, icon, value, badge).
 */
const AdminKpiGrid = ({ items, columns = 4, className = '' }) => {
  const gridClass = GRID_CLASS[columns] || GRID_CLASS[4];

  return (
    <div className={`${gridClass}${className ? ` ${className}` : ''}`}>
      {items.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass || ''}`.trim()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">
                {kpi.label}
              </span>
              {Icon ? <Icon className={`w-4 h-4 ${kpi.color} opacity-60`} /> : null}
            </div>
            <p
              className={`text-xl font-black ${kpi.color} leading-none truncate font-heading`}
              title={String(kpi.value)}
            >
              {kpi.value}
            </p>
            {kpi.badge ? (
              <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{kpi.badge}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default AdminKpiGrid;

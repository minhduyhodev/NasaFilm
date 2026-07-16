import React from 'react';
import './AdminKpiGrid.css';

const GRID_CLASS = {
  3: 'admin-kpi-grid admin-kpi-grid--3',
  4: 'admin-kpi-grid admin-kpi-grid--4',
  5: 'admin-kpi-grid admin-kpi-grid--5',
};

/**
 * KPI summary cards — label, optional icon, value, meta badge (real data only).
 */
const AdminKpiGrid = ({ items, columns = 4, className = '' }) => {
  const gridClass = GRID_CLASS[columns] || GRID_CLASS[4];

  return (
    <div className={`${gridClass}${className ? ` ${className}` : ''}`}>
      {items.map((kpi) => {
        const Icon = kpi.icon;
        const Tag = kpi.onClick ? 'button' : 'div';
        return (
          <Tag
            key={kpi.label}
            type={kpi.onClick ? 'button' : undefined}
            onClick={kpi.onClick}
            className={`kpi-card adm-kpi-card ${kpi.onClick ? 'adm-kpi-card--clickable' : ''} ${kpi.active ? 'adm-kpi-card--active' : ''} ${kpi.kpiClass || ''}`.trim()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="adm-kpi-card__label">{kpi.label}</span>
              {Icon ? <Icon className={`w-4 h-4 ${kpi.color || 'text-slate-400'} opacity-70`} /> : null}
            </div>
            <p
              className={`adm-kpi-card__value adm-tabular ${kpi.color || ''}`.trim()}
              title={String(kpi.value)}
            >
              {kpi.value}
            </p>
            {kpi.badge ? <p className="adm-kpi-card__meta">{kpi.badge}</p> : null}
          </Tag>
        );
      })}
    </div>
  );
};

export default AdminKpiGrid;

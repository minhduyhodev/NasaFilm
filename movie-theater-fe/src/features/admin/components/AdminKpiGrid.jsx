import './AdminKpiGrid.css';

const GRID_CLASS = {
  3: 'admin-kpi-grid admin-kpi-grid--3',
  4: 'admin-kpi-grid admin-kpi-grid--4',
  5: 'admin-kpi-grid admin-kpi-grid--5',
  7: 'admin-kpi-grid admin-kpi-grid--7',
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
            <div className="adm-kpi-card__row">
              <div className="adm-kpi-card__text">
                <span className="adm-kpi-card__label">{kpi.label}</span>
                <p
                  className={`adm-kpi-card__value adm-tabular ${kpi.color || ''}`.trim()}
                  title={String(kpi.value)}
                >
                  {kpi.value}
                </p>
                {kpi.badge ? <p className="adm-kpi-card__meta">{kpi.badge}</p> : null}
              </div>
              {Icon ? (
                <span className={`adm-kpi-card__icon ${kpi.color || ''}`.trim()} aria-hidden="true">
                  <Icon className="adm-kpi-card__icon-svg" />
                </span>
              ) : null}
            </div>
          </Tag>
        );
      })}
    </div>
  );
};

export default AdminKpiGrid;

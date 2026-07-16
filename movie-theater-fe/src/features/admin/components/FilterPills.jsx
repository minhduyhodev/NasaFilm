import React from 'react';

/**
 * Status / tab filter pills. Each item: { id, label, count? }.
 * Counts must come from real data — omit count if unknown.
 */
const FilterPills = ({ items = [], value, onChange, className = '', ariaLabel = 'Bộ lọc' }) => (
  <div className={`adm-filter-pills${className ? ` ${className}` : ''}`} role="tablist" aria-label={ariaLabel}>
    {items.map((item) => {
      const active = value === item.id;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active}
          className={`adm-filter-pill${active ? ' adm-filter-pill--active' : ''}`}
          onClick={() => onChange?.(item.id)}
        >
          <span>{item.label}</span>
          {item.count != null && (
            <span className="adm-filter-pill__count">{item.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

export default FilterPills;

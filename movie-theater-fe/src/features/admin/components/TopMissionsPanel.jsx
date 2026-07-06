import { BarChart3 } from 'lucide-react';
import './TopMissionsPanel.css';

const TopMissionsPanel = ({ topTemplates = [], className = '' }) => {
  if (!topTemplates.length) {
    return null;
  }

  return (
    <section
      className={`top-missions-panel ${className}`.trim()}
      aria-label="Top nhiệm vụ theo lượt tham gia"
    >
      <div className="top-missions-panel__head">
        <BarChart3 size={16} aria-hidden />
        <h3>Top nhiệm vụ theo lượt tham gia</h3>
      </div>
      <ul className="top-missions-panel__list">
        {topTemplates.map((item) => (
          <li key={item.code} className="top-missions-panel__item">
            <div>
              <strong>{item.title || item.code}</strong>
              <span>
                {item.enrolledCount} tham gia · {item.completedCount} hoàn thành
              </span>
            </div>
            <span className="top-missions-panel__rate">
              {Math.round(item.completionRate ?? 0)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TopMissionsPanel;

import React from 'react';
import { Film, Play, Calendar, Star } from 'lucide-react';
import './MoviesPage.css';

const MoviesPage = () => {
  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <h1 className="admin-title">Manage Movies</h1>
          <p className="admin-subtitle">Movie Inventory & Catalog Management</p>
        </div>
        <button className="admin-add-btn">
          <span className="material-symbols-outlined">add</span>
          Add New Movie
        </button>
      </div>

      <div className="admin-stats-grid">
        {[
          {
            label: 'TOTAL MOVIES',
            value: '124',
            sub: 'from last month',
            trend: '+4%',
            Icon: Film
          },
          {
            label: 'LIVE NOW',
            value: '18',
            sub: 'Currently screening',
            hasDot: true,
            Icon: Play
          },
          {
            label: 'UPCOMING',
            value: '42',
            sub: 'Scheduled premieres',
            Icon: Calendar
          },
          {
            label: 'AVG RATING',
            value: '4.8',
            sub: 'Target: 5.0 score',
            hasProgress: true,
            progressValue: '96%',
            Icon: Star
          }
        ].map((card) => (
          <div key={card.label} className="admin-stat-card group">
            {/* Watermark Icon */}
            <card.Icon className="absolute -right-4 -top-4 w-24 h-24 text-white/5 group-hover:text-white/10 transition-colors duration-300" strokeWidth={1} />

            <div>
              <div className="admin-stat-card-top">
                <p className="admin-stat-label">{card.label}</p>
                <card.Icon className="text-[#6e7191] w-5 h-5" strokeWidth={2} />
              </div>
              <div className="admin-stat-value-group">
                <h3 className="admin-stat-value">{card.value}</h3>
                {card.trend && (
                  <span className="admin-stat-trend">
                    {card.trend} <span className="admin-stat-trend-arrow">↑</span>
                  </span>
                )}
              </div>
            </div>

            <div className="admin-stat-footer">
              {card.hasProgress ? (
                <div className="space-y-2">
                  <div className="admin-progress-bg">
                    <div className="admin-progress-fill" style={{ width: card.progressValue }} />
                  </div>
                  <p className="admin-progress-label">{card.sub}</p>
                </div>
              ) : (
                <p className="admin-stat-desc">
                  {card.hasDot && <span className="admin-stat-desc-dot" />}
                  {card.trend ? <span className="admin-stat-desc-italic">{card.sub}</span> : card.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <span className="admin-search-icon">search</span>
            <input className="admin-search-input" placeholder="Filter by title, genre, or director..." />
          </div>
          <div className="admin-action-group">
            <button className="admin-action-btn">Filters</button>
            <button className="admin-action-btn">Export CSV</button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-thead-tr">
                <th className="pb-3">Movie</th>
                <th className="pb-3">Genre</th>
                <th className="pb-3">Release Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { title: 'Neon Genesis: Redemption', genre: 'Sci-Fi / Thriller', date: 'Nov 24, 2024', status: 'Live' },
                { title: 'Echoes of the Summit', genre: 'Drama', date: 'Dec 12, 2024', status: 'Draft' },
                { title: 'The Attic Watcher', genre: 'Horror', date: 'Oct 31, 2024', status: 'Archived' },
                { title: 'Midnight Heist', genre: 'Action / Crime', date: 'Jan 15, 2025', status: 'Live' },
              ].map((row) => (
                <tr key={row.title} className="admin-table-tr">
                  <td className="admin-table-td-name">
                    <div className="admin-table-name">{row.title}</div>
                    <div className="admin-table-desc">By studio cinema</div>
                  </td>
                  <td className="admin-table-td-genre">{row.genre}</td>
                  <td className="admin-table-td-date">{row.date}</td>
                  <td className="py-4 pr-6">
                    <span className={row.status === 'Live' ? 'admin-badge-live' : row.status === 'Draft' ? 'admin-badge-draft' : 'admin-badge-archived'}>
                      {row.status}
                    </span>
                  </td>
                  <td className="admin-table-actions-td">Edit · Delete</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default MoviesPage;

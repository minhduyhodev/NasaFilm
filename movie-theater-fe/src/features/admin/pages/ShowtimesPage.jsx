import React from 'react';
import { Film, SlidersHorizontal, Download, Search, Edit2, Trash2, Calendar, Tv, Clock, Activity } from 'lucide-react';
import './ShowtimesPage.css';

const ShowtimesPage = () => {
  const cards = [
    {
      label: 'TODAY',
      value: '48',
      sub: 'Active sessions',
      isGreen: true,
      Icon: Clock,
    },
    {
      label: 'UPCOMING',
      value: '112',
      sub: 'Next 3 days',
      isGreen: false,
      Icon: Calendar,
    },
    {
      label: 'AUDITORIUMS',
      value: '18',
      sub: 'Available screens',
      isGreen: false,
      Icon: Tv,
    },
    {
      label: 'FILL RATE',
      value: '76%',
      sub: 'Average booking',
      isGreen: false,
      isItalic: true,
      Icon: Activity,
    },
  ];

  const showtimes = [
    { title: 'Neon Genesis: Redemption', cinema: 'Hall 3', time: '19:30', screen: 'IMAX', status: 'Live' },
    { title: 'Echoes of the Summit', cinema: 'Hall 1', time: '16:00', screen: 'Standard', status: 'Scheduled' },
    { title: 'The Attic Watcher', cinema: 'Hall 2', time: '22:00', screen: 'Horror Room', status: 'Draft' },
    { title: 'Midnight Heist', cinema: 'Hall 5', time: '21:15', screen: 'VIP', status: 'Live' },
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">MANAGE SHOWTIMES</p>
          <h1 className="admin-title">Screening Schedule</h1>
          <p className="admin-description">
            Schedule screening sessions, update show timings, and monitor theater room occupancy levels in real-time.
          </p>
        </div>
        <button className="admin-add-btn">
          <span className="admin-add-btn-plus">+</span>
          <div className="admin-add-btn-label-group">
            <div className="admin-add-btn-sub">Add</div>
            <div className="admin-add-btn-main">Showtime</div>
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
              placeholder="Search showtimes, cinemas, or movies..."
            />
          </div>
          <div className="admin-action-group">
            <button className="admin-action-btn">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button className="admin-action-btn">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-thead-tr">
                <th className="pb-3">MOVIE</th>
                <th className="pb-3">CINEMA</th>
                <th className="pb-3">TIME</th>
                <th className="pb-3">SCREEN</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {showtimes.map((row) => (
                <tr key={row.title} className="admin-table-tr">
                  <td className="admin-table-td-showtime">
                    <div className="admin-showtime-icon-wrapper">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="admin-showtime-name">{row.title}</div>
                      <div className="admin-showtime-desc">Standard Release</div>
                    </div>
                  </td>
                  <td className="admin-table-td-val">{row.cinema}</td>
                  <td className="admin-table-td-val">{row.time}</td>
                  <td className="admin-table-td-val">{row.screen}</td>
                  <td className="py-4 pr-6">
                    <span
                      className={
                        row.status === 'Live'
                          ? 'admin-badge-live'
                          : row.status === 'Scheduled'
                          ? 'admin-badge-scheduled'
                          : 'admin-badge-closed'
                      }
                    >
                      {row.status}
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

export default ShowtimesPage;

import React from 'react';
import { User, SlidersHorizontal, Download, Search, Edit2, Trash2, Users, Crown, UserPlus, Activity } from 'lucide-react';
import './UsersPage.css';

const UsersPage = () => {
  const cards = [
    {
      label: 'TOTAL USERS',
      value: '12.5k',
      sub: '+8% from last month',
      isGreen: true,
      Icon: Users,
    },
    {
      label: 'ACTIVE NOW',
      value: '1,204',
      sub: 'Live sessions',
      isGreen: true,
      Icon: Activity,
    },
    {
      label: 'PREMIUM',
      value: '3.8k',
      sub: '30% conversion',
      isGreen: false,
      Icon: Crown,
    },
    {
      label: 'NEW THIS MONTH',
      value: '452',
      sub: 'Target 600',
      isGreen: false,
      isItalic: true,
      Icon: UserPlus,
    },
  ];

  const users = [
    { name: 'Julian Rossi', email: 'j.rossi@example.com', tier: 'Platinum', status: 'Active', bookings: '142', active: 'Oct 24, 2023' },
    { name: 'Elena Vane', email: 'vane.cinema@web.io', tier: 'Gold', status: 'Active', bookings: '89', active: 'Oct 25, 2023' },
    { name: 'Marcus Knight', email: 'm.knight@void.net', tier: 'Bronze', status: 'Suspended', bookings: '12', active: 'Sep 12, 2023' },
    { name: 'David Chen', email: 'd.chen@dcloud.net', tier: 'Gold', status: 'Inactive', bookings: '56', active: 'Oct 02, 2023' },
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">USER ACCOUNTS</p>
          <h1 className="admin-title">Manage Customers</h1>
          <p className="admin-description">
            Review membership tiers, track active users, and monitor account registration activity across the full customer base.
          </p>
        </div>
        <button className="admin-add-btn">
          <span className="admin-add-btn-plus">+</span>
          <div className="admin-add-btn-label-group">
            <div className="admin-add-btn-sub">Add</div>
            <div className="admin-add-btn-main">User</div>
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
              placeholder="Filter by name, email, or ID..."
            />
          </div>
          <div className="admin-action-group">
            <button className="admin-action-btn">
              <SlidersHorizontal className="w-4 h-4" />
              All Tiers
            </button>
            <button className="admin-action-btn">
              <SlidersHorizontal className="w-4 h-4" />
              Any Status
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-thead-tr">
                <th className="pb-3">USER</th>
                <th className="pb-3">TIER</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3">BOOKINGS</th>
                <th className="pb-3">LAST ACTIVE</th>
                <th className="pb-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((row) => (
                <tr key={row.email} className="admin-table-tr">
                  <td className="admin-table-td-user">
                    <div className="admin-user-icon-wrapper">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="admin-user-name">{row.name}</div>
                      <div className="admin-user-email">{row.email}</div>
                    </div>
                  </td>
                  <td className="admin-table-td-val">{row.tier}</td>
                  <td className="py-4 pr-6">
                    <span
                      className={
                        row.status === 'Active'
                          ? 'admin-badge-active'
                          : row.status === 'Suspended'
                          ? 'admin-badge-suspended'
                          : 'admin-badge-inactive'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="admin-table-td-val">{row.bookings}</td>
                  <td className="admin-table-td-active">{row.active}</td>
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

export default UsersPage;

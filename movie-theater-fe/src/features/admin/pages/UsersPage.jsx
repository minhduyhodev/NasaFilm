import React from 'react';

const UsersPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-on-surface-variant mb-2">User Accounts</p>
          <h1 className="font-headline-xl text-white">Manage Customers</h1>
          <p className="max-w-2xl text-on-surface-variant mt-2">Review membership tiers, active users, and account activity for the full customer base.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">person_add</span>
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: '12.5k', badge: '+8% from last month' },
          { label: 'Active Now', value: '1,204', badge: 'Live sessions' },
          { label: 'Premium', value: '3.8k', badge: '30% conversion' },
          { label: 'New This Month', value: '452', badge: 'Target 600' },
        ].map((card) => (
          <div key={card.label} className="rounded-[28px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant mb-4">{card.label}</p>
            <h3 className="font-headline-lg text-white">{card.value}</h3>
            <p className="text-on-surface-variant mt-3">{card.badge}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[32px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="relative w-full lg:max-w-xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input className="w-full rounded-full bg-[#0f1117] py-3 pl-14 pr-4 text-white placeholder:text-on-surface-variant border border-white/10 focus:outline-none focus:ring-2 focus:ring-error/30" placeholder="Filter by name, email, or ID..." />
          </div>
          <div className="flex gap-3">
            <button className="rounded-full border border-white/10 bg-[#11131b] px-4 py-3 text-sm text-on-surface-variant">All Tiers</button>
            <button className="rounded-full border border-white/10 bg-[#11131b] px-4 py-3 text-sm text-on-surface-variant">Any Status</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-3 text-sm">
            <thead>
              <tr className="text-on-surface-variant text-xs uppercase tracking-[0.2em]">
                <th className="pb-3">User</th>
                <th className="pb-3">Tier</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Bookings</th>
                <th className="pb-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Julian Rossi', email: 'j.rossi@example.com', tier: 'Platinum', status: 'Active', bookings: '142', active: 'Oct 24, 2023' },
                { name: 'Elena Vane', email: 'vane.cinema@web.io', tier: 'Gold', status: 'Active', bookings: '89', active: 'Oct 25, 2023' },
                { name: 'Marcus Knight', email: 'm.knight@void.net', tier: 'Bronze', status: 'Suspended', bookings: '12', active: 'Sep 12, 2023' },
                { name: 'David Chen', email: 'd.chen@dcloud.net', tier: 'Gold', status: 'Inactive', bookings: '56', active: 'Oct 02, 2023' },
              ].map((row) => (
                <tr key={row.email} className="bg-[#0d0f16] rounded-[24px]">
                  <td className="py-4 pr-6">
                    <div className="font-semibold text-white">{row.name}</div>
                    <div className="text-on-surface-variant text-xs mt-1">{row.email}</div>
                  </td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.tier}</td>
                  <td className="py-4 pr-6">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-300' : row.status === 'Suspended' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-slate-600/10 text-slate-300'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.bookings}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.active}</td>
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

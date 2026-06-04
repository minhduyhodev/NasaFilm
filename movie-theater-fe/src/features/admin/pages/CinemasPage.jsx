import React from 'react';

const CinemasPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-on-surface-variant mb-2">Manage Cinemas</p>
          <h1 className="font-headline-xl text-white">Cinema Locations</h1>
          <p className="max-w-2xl text-on-surface-variant mt-2">Manage theater locations, screen counts, and facility availability across your network.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">add</span>
          Add Cinema
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Locations', value: '14', badge: 'Open theaters' },
          { label: 'Screens', value: '78', badge: 'Total auditoriums' },
          { label: 'VIP Rooms', value: '12', badge: 'Premium seating' },
          { label: 'Open Today', value: '11', badge: 'Now operating' },
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
            <input className="w-full rounded-full bg-[#0f1117] py-3 pl-14 pr-4 text-white placeholder:text-on-surface-variant border border-white/10 focus:outline-none focus:ring-2 focus:ring-error/30" placeholder="Search cinema by location or capacity..." />
          </div>
          <div className="flex gap-3">
            <button className="rounded-full border border-white/10 bg-[#11131b] px-4 py-3 text-sm text-on-surface-variant">Filters</button>
            <button className="rounded-full border border-white/10 bg-[#11131b] px-4 py-3 text-sm text-on-surface-variant">Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-3 text-sm">
            <thead>
              <tr className="text-on-surface-variant text-xs uppercase tracking-[0.2em]">
                <th className="pb-3">Location</th>
                <th className="pb-3">Screens</th>
                <th className="pb-3">VIP</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { location: 'Downtown Plaza', screens: '12', vip: '3', status: 'Open' },
                { location: 'Riverfront Mall', screens: '8', vip: '2', status: 'Open' },
                { location: 'Sunset Boulevard', screens: '10', vip: '1', status: 'Maintenance' },
                { location: 'Harborview Center', screens: '14', vip: '4', status: 'Open' },
              ].map((row) => (
                <tr key={row.location} className="bg-[#0d0f16] rounded-[24px]">
                  <td className="py-4 pr-6 font-semibold text-white">{row.location}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.screens}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.vip}</td>
                  <td className="py-4 pr-6">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${row.status === 'Open' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                      {row.status}
                    </span>
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

export default CinemasPage;

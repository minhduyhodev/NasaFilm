import React from 'react';

const ShowtimesPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-on-surface-variant mb-2">Manage Showtimes</p>
          <h1 className="font-headline-xl text-white">Screening Schedule</h1>
          <p className="max-w-2xl text-on-surface-variant mt-2">Schedule sessions, update timings, and monitor screening occupancy per cinema.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">add</span>
          Add Showtime
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Today', value: '48', badge: 'Active sessions' },
          { label: 'Upcoming', value: '112', badge: 'Next 3 days' },
          { label: 'Auditoriums', value: '18', badge: 'Available screens' },
          { label: 'Fill Rate', value: '76%', badge: 'Average booking' },
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
            <input className="w-full rounded-full bg-[#0f1117] py-3 pl-14 pr-4 text-white placeholder:text-on-surface-variant border border-white/10 focus:outline-none focus:ring-2 focus:ring-error/30" placeholder="Search showtimes, cinemas, or movies..." />
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
                <th className="pb-3">Movie</th>
                <th className="pb-3">Cinema</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Screen</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { title: 'Neon Genesis: Redemption', cinema: 'Hall 3', time: '19:30', screen: 'IMAX', status: 'Live' },
                { title: 'Echoes of the Summit', cinema: 'Hall 1', time: '16:00', screen: 'Standard', status: 'Scheduled' },
                { title: 'The Attic Watcher', cinema: 'Hall 2', time: '22:00', screen: 'Horror Room', status: 'Draft' },
                { title: 'Midnight Heist', cinema: 'Hall 5', time: '21:15', screen: 'VIP', status: 'Live' },
              ].map((row) => (
                <tr key={row.title} className="bg-[#0d0f16] rounded-[24px]">
                  <td className="py-4 pr-6 font-semibold text-white">{row.title}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.cinema}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.time}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.screen}</td>
                  <td className="py-4 pr-6">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${row.status === 'Live' ? 'bg-emerald-500/10 text-emerald-300' : row.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
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

export default ShowtimesPage;

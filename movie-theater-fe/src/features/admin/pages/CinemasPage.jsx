import React from 'react';
import { MapPin, SlidersHorizontal, Download, Search, Edit2, Trash2, Crown, Tv, Activity } from 'lucide-react';

const CinemasPage = () => {
  const cards = [
    {
      label: 'LOCATIONS',
      value: '14',
      sub: 'Open theaters',
      isGreen: true,
      Icon: MapPin,
    },
    {
      label: 'SCREENS',
      value: '78',
      sub: 'Total auditoriums',
      isGreen: false,
      Icon: Tv,
    },
    {
      label: 'VIP ROOMS',
      value: '12',
      sub: 'Premium seating',
      isGreen: false,
      isItalic: true,
      Icon: Crown,
    },
    {
      label: 'OPEN TODAY',
      value: '11',
      sub: 'Now operating',
      isGreen: true,
      Icon: Activity,
    },
  ];

  const cinemas = [
    {
      name: 'Downtown Plaza',
      desc: 'District 7, Central Hub',
      screens: 12,
      vip: 3,
      status: 'Open',
    },
    {
      name: 'Riverfront Mall',
      desc: 'East Waterfront, Sector A',
      screens: 8,
      vip: 2,
      status: 'Open',
    },
    {
      name: 'North Point Galaxy',
      desc: 'Northern Heights, Residential',
      screens: 16,
      vip: 4,
      status: 'Closed',
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ccbba3]">MANAGE CINEMAS</p>
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Cinema Locations</h1>
          <p className="max-w-3xl text-sm text-[#8a8d9f] font-medium leading-relaxed mt-2">
            Manage theater locations, screen counts, and facility availability across your network. Optimize performance through detailed location oversight.
          </p>
        </div>
        <button className="inline-flex items-center gap-5 rounded-[22px] bg-red-600 hover:bg-[#d12c2c] px-8 py-[18px] text-white shadow-[0_20px_50px_rgba(220,38,38,0.3)] transition shrink-0">
          <span className="text-3xl font-light leading-none">+</span>
          <div className="text-left leading-tight">
            <div className="font-semibold text-sm text-white/80">Add</div>
            <div className="font-black text-lg">Cinema</div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[20px] bg-[#11121a] border border-white/5 p-6 h-[140px] relative overflow-hidden flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-300 group"
          >
            {/* Watermark Icon */}
            <card.Icon className="absolute -right-4 -top-4 w-20 h-20 text-white/5 group-hover:text-white/10 transition-colors duration-300" strokeWidth={1} />

            <div className="flex items-center justify-between z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6e7191]">{card.label}</p>
              <card.Icon className="text-[#6e7191] w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="text-4xl font-bold text-white tracking-tight leading-none z-10">{card.value}</h3>
            <p className={`text-xs ${card.isGreen ? 'text-emerald-400 font-semibold' : 'text-[#8a8d9f] font-medium'} ${card.isItalic ? 'italic' : ''}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] bg-[#11121a] border border-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e7191] w-4.5 h-4.5" />
            <input
              className="w-full rounded-xl bg-[#161722] border border-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#6e7191] focus:outline-none focus:border-red-500/50 transition-all duration-300"
              placeholder="Search cinema by location or capacity..."
            />
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161722] border border-white/5 text-[#8a8d9f] text-sm font-semibold hover:bg-white/5 transition-colors duration-300">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161722] border border-white/5 text-[#8a8d9f] text-sm font-semibold hover:bg-white/5 transition-colors duration-300">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-[#6e7191] text-[11px] font-bold uppercase tracking-[0.2em] border-b border-white/5 pb-3">
                <th className="pb-3">LOCATION</th>
                <th className="pb-3">SCREENS</th>
                <th className="pb-3">VIP</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cinemas.map((row) => (
                <tr key={row.name} className="hover:bg-white/[0.01] transition-colors duration-300">
                  <td className="py-4 pr-6 flex items-center">
                    <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center text-[#8a8d9f] mr-4 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-base leading-tight">{row.name}</div>
                      <div className="text-xs text-[#6e7191] mt-1 font-medium">{row.desc}</div>
                    </div>
                  </td>
                  <td className="py-4 pr-6 font-bold text-white text-base">{row.screens}</td>
                  <td className="py-4 pr-6 font-bold text-white text-base">{row.vip}</td>
                  <td className="py-4 pr-6">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider ${
                        row.status === 'Open'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button className="text-[#8a8d9f] hover:text-white transition-colors duration-300" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-[#8a8d9f] hover:text-red-500 transition-colors duration-300" title="Delete">
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

export default CinemasPage;

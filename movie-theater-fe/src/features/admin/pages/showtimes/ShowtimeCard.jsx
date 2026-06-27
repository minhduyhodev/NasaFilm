import React from 'react';
import { MapPin, Tv, Clock } from 'lucide-react';
import { handlePosterError } from '../../../../shared/utils/mediaUrlUtils';
import { StatusBadge } from './showtimesUi';
import {
  formatTimeOnly,
  formatDateShort,
  formatWeekday,
  getValidTransitions,
  getTransitionBtnClass,
} from './showtimesConstants';

const ShowtimeCard = ({
  row,
  movies,
  isSelected,
  onToggleSelect,
  onStatusTransition,
  getPosterSrc,
}) => {
  const trans = getValidTransitions(row.status);
  const movieObj = movies.find((m) => m.uuid === row.movieUuid);
  const rawPoster = movieObj?.primaryMediaUrl || row.moviePosterUrl;

  return (
    <div
      key={row.uuid}
      className={`st-card status-${row.status} ${isSelected ? 'selected' : ''} flex gap-4`}
    >
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg overflow-hidden border border-[#1a2238] bg-[#0F1322] relative shadow-md">
          <img
            src={getPosterSrc(rawPoster, 160)}
            data-original-url={rawPoster || ''}
            alt={row.movieTitle}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={handlePosterError}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            type="checkbox"
            className="st-checkbox cursor-pointer"
            checked={isSelected}
            onChange={() => onToggleSelect(row.uuid)}
          />
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">Chọn</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <StatusBadge status={row.status} />
            <div className="flex items-center gap-1 text-white font-mono text-xs font-bold bg-[#0F1322]/80 px-2 py-0.5 rounded border border-[#1a2238]">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{formatTimeOnly(row.startTime)}</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">{formatTimeOnly(row.endTime)}</span>
            </div>
          </div>

          <h3 className="text-xs sm:text-[13px] font-black text-white leading-snug line-clamp-2 mb-1.5" title={row.movieTitle}>
            {row.movieTitle}
          </h3>

          <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-2">
            <MapPin className="w-3 h-3 shrink-0 text-gray-500" />
            <span className="truncate max-w-[100px]">{row.cinemaName}</span>
            <span className="text-gray-600">•</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold">
              <Tv className="w-2.5 h-2.5" />{row.cinemaRoomName}
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Giá vé</p>
              <p
                className="text-amber-400 font-mono text-xs font-black"
                title={`Thường: ${row.basePrice?.toLocaleString('vi-VN')}đ\nVIP: ${row.vipPrice?.toLocaleString('vi-VN')}đ\nĐôi: ${row.couplePrice?.toLocaleString('vi-VN')}đ`}
              >
                {row.basePrice?.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Ngày chiếu</p>
              <p className="text-gray-400 font-mono text-[10px] font-bold">
                {row.startTime ? formatDateShort(new Date(row.startTime)) : ''} ({row.startTime ? formatWeekday(new Date(row.startTime)) : ''})
              </p>
            </div>
          </div>
        </div>

        <div className="mt-1 pt-1.5 border-t border-[#1a2238]/60 flex justify-end">
          {trans.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {trans.map((t) => (
                <button
                  key={t.target}
                  type="button"
                  onClick={() => onStatusTransition(row.uuid, t.target)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition duration-150 cursor-pointer ${getTransitionBtnClass(t.target)}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-gray-600 italic">Trạng thái cuối</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowtimeCard;

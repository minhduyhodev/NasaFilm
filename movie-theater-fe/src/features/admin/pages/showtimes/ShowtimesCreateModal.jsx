import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Search, ChevronDown, Clock, AlertTriangle, CheckCircle2, Armchair,
} from 'lucide-react';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../../shared/utils/mediaUrlUtils';
import { AdminDateTimePicker } from '../../components';
import {
  vnDayKey,
  formatTimeOnly,
  formatPrice,
  STATUS_CONFIG,
} from './showtimesConstants';

const TRAILER_BUFFER_MIN = 10;

const TIME_PRESETS = ['09:00', '13:30', '16:00', '19:00', '21:30'];

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const getMoviePoster = (movie) => movie?.primaryMediaUrl || movie?.posterUrl || movie?.moviePosterUrl || '';

const MoviePosterThumb = ({ movie, size = 'sm', className = '' }) => {
  const rawPoster = getMoviePoster(movie);
  const dim = size === 'lg' ? 'w-12 h-[68px]' : 'w-9 h-12';
  return (
    <div className={`${dim} rounded-md overflow-hidden border border-[#1a2238] bg-[#0F1322] shrink-0 ${className}`}>
      <img
        src={getPosterSrc(rawPoster, size === 'lg' ? 160 : 80)}
        data-original-url={rawPoster || ''}
        alt={movie?.title || 'Poster phim'}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        onError={handlePosterError}
      />
    </div>
  );
};

const PriceField = ({ label, value, onChange }) => (
  <div className="stcm-price">
    <label className="st-auto-label">{label}</label>
    <input
      type="number"
      min="10000"
      step="5000"
      required
      className="st-auto-input font-mono"
      value={value}
      onChange={onChange}
    />
    <span className="stcm-price__hint">{formatPrice(Number(value) || 0)}</span>
  </div>
);

const ShowtimesCreateModal = ({
  onClose,
  formData,
  setFormData,
  cinemas,
  rooms,
  isLoadingRooms,
  showtimes = [],
  filteredMovies,
  selectedMovie,
  isLoadingMovies,
  isMovieDropdownOpen,
  setIsMovieDropdownOpen,
  searchMovieKeyword,
  setSearchMovieKeyword,
  handleCinemaChange,
  handleSubmit,
}) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ---------- Tính toán lịch chiếu trực tiếp trên form ----------
  const startAt = useMemo(() => {
    if (!formData.startTime) return null;
    const d = new Date(formData.startTime);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [formData.startTime]);

  const durationMin = selectedMovie?.durationMinutes || 0;

  const estimatedEnd = useMemo(() => {
    if (!startAt || !durationMin) return null;
    return new Date(startAt.getTime() + (durationMin + TRAILER_BUFFER_MIN) * 60000);
  }, [startAt, durationMin]);

  // Suất hiện có trong phòng đã chọn, cùng ngày với giờ bắt đầu
  const roomDaySchedule = useMemo(() => {
    if (!formData.cinemaRoomUuid || !startAt) return [];
    const dayKey = vnDayKey(startAt);
    return showtimes
      .filter(s =>
        s.cinemaRoomUuid === formData.cinemaRoomUuid &&
        s.startTime && vnDayKey(s.startTime) === dayKey &&
        s.status !== 'CANCELLED'
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [showtimes, formData.cinemaRoomUuid, startAt]);

  // Kiểm tra trùng khung giờ với suất hiện có
  const conflictWith = useMemo(() => {
    if (!startAt || !estimatedEnd) return null;
    return roomDaySchedule.find(s => {
      const sStart = new Date(s.startTime);
      const sEnd = s.endTime ? new Date(s.endTime) : sStart;
      return startAt < sEnd && estimatedEnd > sStart;
    }) || null;
  }, [roomDaySchedule, startAt, estimatedEnd]);

  const isPast = startAt ? startAt.getTime() <= Date.now() : false;
  const canSubmit = Boolean(
    formData.movieUuid && formData.cinemaRoomUuid && startAt && !isPast && !conflictWith,
  );

  const applyTimePreset = (hhmm) => {
    const datePart = formData.startTime
      ? formData.startTime.slice(0, 10)
      : vnDayKey(new Date());
    setFormData(prev => ({ ...prev, startTime: `${datePart}T${hhmm}` }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        className="stcm-modal w-full h-[100dvh] sm:h-auto max-h-none sm:max-h-[92vh] sm:max-w-xl sm:rounded-xl bg-[#090D1A] sm:border sm:border-[#1a2238] shadow-2xl text-left relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="stcm-head">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
            <Plus className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Thêm suất chiếu mới</h2>
            <p className="text-[10px] text-gray-500">Hệ thống tự kiểm tra trùng giờ với lịch hiện có của phòng</p>
          </div>
          <button
            type="button"
            className="ml-auto p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors shrink-0"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="stcm-body custom-scrollbar">
            {/* ===== Phim ===== */}
            <section className="stcm-section">
              <label className="st-auto-label">Phim chiếu *</label>
              <div className="relative">
                <button
                  type="button"
                  className="stcm-movie-trigger"
                  onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                >
                  <span className="flex items-center gap-2.5 min-w-0 flex-1">
                    {selectedMovie && <MoviePosterThumb movie={selectedMovie} size="sm" />}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-white">
                        {selectedMovie ? selectedMovie.title : 'Chọn phim từ cơ sở dữ liệu...'}
                      </span>
                      {selectedMovie && (
                        <span className="block text-[10px] text-gray-500 mt-0.5">
                          {selectedMovie.durationMinutes} phút (+{TRAILER_BUFFER_MIN}p trailer) · {selectedMovie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isMovieDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMovieDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#090D1A] border border-[#1a2238] rounded-lg shadow-2xl max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    <div className="sticky top-0 bg-[#090D1A] p-2 border-b border-[#1a2238] flex items-center gap-2 mb-1">
                      <Search className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Tìm nhanh tên phim..."
                        className="w-full text-xs outline-none border-none bg-transparent text-white"
                        value={searchMovieKeyword}
                        onChange={(e) => setSearchMovieKeyword(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {isLoadingMovies ? (
                      <div className="text-center py-4 text-xs text-gray-400">Đang tải danh sách phim...</div>
                    ) : filteredMovies.length > 0 ? (
                      filteredMovies.map(movie => (
                        <button
                          key={movie.uuid}
                          type="button"
                          className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition text-left cursor-pointer ${formData.movieUuid === movie.uuid ? 'bg-red-500/10 border border-red-500/30' : 'border border-transparent'}`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                            setIsMovieDropdownOpen(false);
                            setSearchMovieKeyword('');
                          }}
                        >
                          <MoviePosterThumb movie={movie} size="sm" />
                          <div className="overflow-hidden leading-tight min-w-0 flex-1">
                            <div className="font-bold text-xs text-white truncate">{movie.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {movie.durationMinutes} phút · {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-400">Không tìm thấy bộ phim nào</div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ===== Rạp & phòng ===== */}
            <section className="stcm-section stcm-grid-2">
              <div>
                <label className="st-auto-label">Rạp chiếu *</label>
                <select
                  className="st-auto-input"
                  value={formData.cinemaUuid}
                  onChange={(e) => handleCinemaChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn rạp --</option>
                  {cinemas.map(c => (
                    <option key={c.uuid} value={c.uuid}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="st-auto-label">Phòng chiếu *</label>
                <select
                  className="st-auto-input"
                  value={formData.cinemaRoomUuid}
                  onChange={(e) => setFormData(prev => ({ ...prev, cinemaRoomUuid: e.target.value }))}
                  required
                  disabled={!formData.cinemaUuid || isLoadingRooms}
                >
                  <option value="">
                    {isLoadingRooms ? 'Đang tải phòng chiếu...' : '-- Chọn phòng --'}
                  </option>
                  {rooms.map(r => (
                    <option key={r.uuid} value={r.uuid}>
                      {r.name} · {r.roomType}{r.capacity != null ? ` · ${r.capacity} ghế` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* ===== Thời gian ===== */}
            <section className="stcm-section">
              <AdminDateTimePicker
                label="Thời gian bắt đầu *"
                value={formData.startTime}
                onChange={(v) => setFormData((prev) => ({ ...prev, startTime: v }))}
                minDate={new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 10)}
                required
              />
              <div className="stcm-presets">
                <span className="stcm-presets__label">Khung giờ nhanh:</span>
                {TIME_PRESETS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`stcm-preset ${formData.startTime?.slice(11, 16) === t ? 'is-active' : ''}`}
                    onClick={() => applyTimePreset(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Trạng thái kiểm tra lịch */}
              {startAt && selectedMovie && (
                conflictWith ? (
                  <div className="stcm-check stcm-check--error">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Trùng giờ với <strong>{conflictWith.movieTitle}</strong>{' '}
                      ({formatTimeOnly(conflictWith.startTime)} → {formatTimeOnly(conflictWith.endTime)}).
                      Chọn khung giờ khác hoặc phòng khác.
                    </span>
                  </div>
                ) : isPast ? (
                  <div className="stcm-check stcm-check--error">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Thời gian bắt đầu đã qua — chỉ được tạo suất cho tương lai.</span>
                  </div>
                ) : (
                  <div className="stcm-check stcm-check--ok">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Khung giờ hợp lệ — kết thúc dự kiến{' '}
                      <strong>{estimatedEnd ? formatTimeOnly(estimatedEnd.toISOString()) : '—'}</strong>{' '}
                      (phim {durationMin}p + {TRAILER_BUFFER_MIN}p trailer).
                    </span>
                  </div>
                )
              )}

              {/* Lịch hiện có của phòng trong ngày */}
              {formData.cinemaRoomUuid && startAt && (
                <div className="stcm-daysched">
                  <span className="stcm-daysched__label">
                    <Clock className="w-3 h-3" /> Lịch phòng ngày {startAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}:
                  </span>
                  {roomDaySchedule.length === 0 ? (
                    <span className="stcm-daysched__empty">Phòng trống cả ngày</span>
                  ) : (
                    <div className="stcm-daysched__chips">
                      {roomDaySchedule.map(s => (
                        <span
                          key={s.uuid}
                          className={`stcm-slot ${conflictWith?.uuid === s.uuid ? 'is-conflict' : ''}`}
                          style={{ '--slot-accent': (STATUS_CONFIG[s.status] || STATUS_CONFIG.DRAFT).accent }}
                          title={`${s.movieTitle} · ${(STATUS_CONFIG[s.status] || STATUS_CONFIG.DRAFT).label}`}
                        >
                          {formatTimeOnly(s.startTime)}–{formatTimeOnly(s.endTime)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ===== Giá vé ===== */}
            <section className="stcm-section">
              <div className="flex items-center gap-1.5 mb-2">
                <Armchair className="w-3.5 h-3.5 text-amber-400" />
                <span className="st-auto-label mb-0">Giá vé theo loại ghế</span>
              </div>
              <div className="stcm-grid-3">
                <PriceField
                  label="Thường (đ) *"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value, 10) || prev.basePrice }))}
                />
                <PriceField
                  label="VIP (đ) *"
                  value={formData.vipPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, vipPrice: parseInt(e.target.value, 10) || prev.vipPrice }))}
                />
                <PriceField
                  label="Đôi (đ) *"
                  value={formData.couplePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, couplePrice: parseInt(e.target.value, 10) || prev.couplePrice }))}
                />
              </div>
            </section>
          </div>

          <footer className="stcm-foot">
            <button
              type="button"
              onClick={onClose}
              className="st-auto-btn st-auto-btn--ghost"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="stcm-submit"
              title={!canSubmit ? 'Điền đủ phim, phòng và khung giờ hợp lệ để tạo suất' : undefined}
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo suất chiếu
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ShowtimesCreateModal;

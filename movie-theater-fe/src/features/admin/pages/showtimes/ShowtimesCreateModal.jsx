import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Search, ChevronDown } from 'lucide-react';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../../shared/utils/mediaUrlUtils';

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const getMoviePoster = (movie) => movie?.primaryMediaUrl || movie?.posterUrl || movie?.moviePosterUrl || '';

const MoviePosterThumb = ({ movie, size = 'sm', className = '' }) => {
  const rawPoster = getMoviePoster(movie);
  const dim = size === 'lg' ? 'w-14 h-20' : 'w-9 h-12';
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

const ShowtimesCreateModal = ({
  onClose,
  formData,
  setFormData,
  cinemas,
  rooms,
  isLoadingRooms,
  movies,
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

  return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#090D1A] border border-[#1a2238] shadow-2xl p-6 text-left relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Plus className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Thêm Suất Chiếu Mới</h2>
                <p className="text-[10px] text-gray-500">Tạo khung giờ chiếu phim mới cho hệ thống rạp</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Movie Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-400">Chọn Phim *</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                    onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      {selectedMovie && <MoviePosterThumb movie={selectedMovie} size="sm" />}
                      <span className="truncate">{selectedMovie ? selectedMovie.title : 'Chọn phim từ cơ sở dữ liệu...'}</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isMovieDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMovieDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#090D1A] border border-[#1a2238] rounded-lg shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      <div className="p-2 border-b border-[#1a2238] flex items-center gap-2 mb-1">
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
                            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition text-left cursor-pointer ${formData.movieUuid === movie.uuid ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'border border-transparent'}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                              setIsMovieDropdownOpen(false);
                              setSearchMovieKeyword('');
                            }}
                          >
                            <MoviePosterThumb movie={movie} size="sm" />
                            <div className="overflow-hidden leading-tight min-w-0 flex-1">
                              <div className="font-bold text-xs text-white truncate">{movie.title}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{movie.durationMinutes} phút · {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">Không tìm thấy bộ phim nào</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedMovie && (
                  <div className="flex items-start gap-3 p-3 bg-[#0F1322]/50 rounded-lg border border-[#1a2238] mt-2 text-left">
                    <MoviePosterThumb movie={selectedMovie} size="lg" />
                    <div className="overflow-hidden leading-normal text-left min-w-0 flex-1">
                      <div className="font-bold text-white truncate text-xs">{selectedMovie.title}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Thời lượng: {selectedMovie.durationMinutes} phút (+10m trailer)
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {selectedMovie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cinema Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Chọn Rạp Chiếu *</label>
                <select
                  className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                  value={formData.cinemaUuid}
                  onChange={(e) => handleCinemaChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn Rạp --</option>
                  {cinemas.map(c => (
                    <option key={c.uuid} value={c.uuid}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Chọn Phòng Chiếu *</label>
                <select
                  className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                  value={formData.cinemaRoomUuid}
                  onChange={(e) => setFormData(prev => ({ ...prev, cinemaRoomUuid: e.target.value }))}
                  required
                  disabled={!formData.cinemaUuid || isLoadingRooms}
                >
                  <option value="">
                    {isLoadingRooms ? 'Đang tải phòng chiếu...' : '-- Chọn Phòng Chiếu --'}
                  </option>
                  {rooms.map(r => (
                    <option key={r.uuid} value={r.uuid}>{r.name} ({r.roomCode} · {r.roomType})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Datetime Picker */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Thời Gian Bắt Đầu *</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Base Ticket Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Thường (đ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 85000 }))}
                  />
                </div>
                {/* VIP Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé VIP (đ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.vipPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, vipPrice: parseInt(e.target.value) || 120000 }))}
                  />
                </div>
                {/* Couple Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Đôi (đ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.couplePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, couplePrice: parseInt(e.target.value) || 160000 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1a2238]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2 text-xs text-white font-bold cursor-pointer transition-colors shadow-md shadow-red-600/10"
                >
                  Tạo Suất Chiếu
                </button>
              </div>
            </form>
          </div>
        </div>,
    document.body,
  );
};

export default ShowtimesCreateModal;

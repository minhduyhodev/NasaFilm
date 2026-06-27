import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarDays, Clock, Film } from 'lucide-react';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../../shared/utils/mediaUrlUtils';
import { formatTimeOnly, formatDateShort, formatWeekday } from './showtimesConstants';

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const ShowtimesAutoModal = ({
  onClose,
  isAutoPreviewOpen,
  autoFormData,
  setAutoFormData,
  cinemas,
  rooms,
  isLoadingRooms,
  onCinemaChange,
  movies,
  handleAutoSubmit,
  previewGenerated,
  selectedPreviewUuids,
  setSelectedPreviewUuids,
  togglePreviewSelection,
  handleSaveAuto,
  isAutoLoading,
  isSavingAuto,
  setIsAutoPreviewOpen,
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
          <div className="w-full max-w-2xl rounded-xl bg-[#090D1A] border border-[#1a2238] shadow-2xl p-6 text-left relative max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
            <button
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <CalendarDays className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tự Động Tạo Suất Chiếu Tối Ưu</h2>
                <p className="text-[10px] text-gray-500">Cấu hình thuật toán tối ưu hóa lịch chiếu theo 5 yếu tố</p>
              </div>
            </div>

            {!isAutoPreviewOpen ? (
              <form onSubmit={handleAutoSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Ngày Bắt Đầu *</label>
                    <input
                      type="date"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.startDate}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Ngày Kết Thúc *</label>
                    <input
                      type="date"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.endDate}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Rạp Chiếu *</label>
                      <select
                        className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        value={autoFormData.cinemaUuid}
                        onChange={(e) => onCinemaChange(e.target.value)}
                        required
                      >
                        <option value="">-- Chọn Rạp --</option>
                        {cinemas.map(c => (
                          <option key={c.uuid} value={c.uuid}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1.5">Chọn Phòng Chiếu *</label>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#0F1322] rounded-lg border border-[#1a2238] custom-scrollbar">
                        {isLoadingRooms ? (
                          <span className="text-[10px] text-gray-500 col-span-2">Đang tải phòng chiếu...</span>
                        ) : rooms.length === 0 ? (
                          <span className="text-[10px] text-gray-500 col-span-2">Vui lòng chọn rạp chiếu trước</span>
                        ) : null}
                        {!isLoadingRooms && rooms.map(room => (
                          <label key={room.uuid} className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={autoFormData.roomUuids.includes(room.uuid)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAutoFormData(prev => {
                                  const nextRooms = checked 
                                    ? [...prev.roomUuids, room.uuid]
                                    : prev.roomUuids.filter(id => id !== room.uuid);
                                  return { ...prev, roomUuids: nextRooms };
                                });
                              }}
                              className="st-checkbox"
                            />
                            <span>{room.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1.5">Chọn Phim Chiếu *</label>
                      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-2 bg-[#0F1322] rounded-lg border border-[#1a2238] custom-scrollbar">
                        {movies.map(movie => (
                          <label key={movie.uuid} className="flex items-center justify-between cursor-pointer text-xs text-gray-300 hover:text-white p-1 hover:bg-white/5 rounded transition-colors">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={autoFormData.movieUuids.includes(movie.uuid)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAutoFormData(prev => {
                                    const nextMovies = checked 
                                      ? [...prev.movieUuids, movie.uuid]
                                      : prev.movieUuids.filter(id => id !== movie.uuid);
                                    return { ...prev, movieUuids: nextMovies };
                                  });
                                }}
                                className="st-checkbox"
                              />
                              <span className="font-bold truncate max-w-[150px]">{movie.title}</span>
                            </div>
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black shrink-0 font-mono">
                              ★ {movie.rating != null ? Number(movie.rating).toFixed(1) : '—'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giờ mở cửa *</label>
                    <input
                      type="time"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.startTime}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giờ đóng cửa *</label>
                    <input
                      type="time"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.endTime}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Dọn dẹp (phút) *</label>
                    <input
                      type="number"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.intervalMinutes}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, intervalMinutes: parseInt(e.target.value) || 15 }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Thường (đ) *</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                      value={autoFormData.basePrice}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 85000 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé VIP (đ) *</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                      value={autoFormData.vipPrice}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, vipPrice: parseInt(e.target.value) || 120000 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Đôi (đ) *</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                      value={autoFormData.couplePrice}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, couplePrice: parseInt(e.target.value) || 160000 }))}
                      required
                    />
                  </div>
                </div>

                {/* Weights Sliders */}
                <div className="bg-[#0F1322]/50 border border-[#1a2238] rounded-xl p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase text-amber-400 font-black">Trọng số thuật toán (Weights)</span>
                    <span className="text-[10px] text-gray-500">Tùy biến mức độ ưu tiên giữa các yếu tố</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weekend Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Cuối tuần (Weekend)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.weekendWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.weekendWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, weekendWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Golden Hour Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Giờ vàng (Golden Hour)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.goldenHourWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.goldenHourWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, goldenHourWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Rating Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Đánh giá phim (Rating)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.ratingWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.ratingWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, ratingWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Genre Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Thể loại phim (Genre)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.genreWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.genreWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, genreWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1a2238] shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAutoLoading}
                    className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs text-white font-bold cursor-pointer transition-colors shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                  >
                    {isAutoLoading ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Đang phân tích...
                      </>
                    ) : (
                      <>Phân tích & Gợi ý</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-3 shrink-0 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">
                    Tìm thấy <span className="text-amber-400">{previewGenerated.length}</span> suất chiếu tối ưu.
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="st-checkbox"
                      checked={previewGenerated.length > 0 && selectedPreviewUuids.size === previewGenerated.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPreviewUuids(new Set(previewGenerated.map((_, idx) => idx)));
                        } else {
                          setSelectedPreviewUuids(new Set());
                        }
                      }}
                    />
                    <span>Chọn tất cả</span>
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] custom-scrollbar">
                  {previewGenerated.map((p, idx) => {
                    const isSelected = selectedPreviewUuids.has(idx);
                    const pillColor = p.priorityScore >= 25 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : p.priorityScore >= 15 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                      : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';

                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 p-3 rounded-lg border bg-[#0B0F19]/90 transition-all ${isSelected ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-[#1a2238] hover:border-gray-700'}`}
                      >
                        <div className="flex items-center shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePreviewSelection(idx)}
                            className="st-checkbox cursor-pointer"
                          />
                        </div>

                        <div className="w-10 h-14 rounded overflow-hidden bg-[#0F1322] border border-[#1a2238] shrink-0">
                          <img
                            src={getPosterSrc(p.moviePosterUrl, 80)}
                            data-original-url={p.moviePosterUrl || ''}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={handlePosterError}
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="font-black text-white text-xs truncate" title={p.movieTitle}>{p.movieTitle}</h4>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-black font-mono shrink-0 ${pillColor}`}>
                                Điểm: {p.priorityScore.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                              <span className="text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded text-[9px] uppercase">{p.cinemaRoomName}</span>
                              <span>•</span>
                              <span>{p.durationMinutes} phút</span>
                              <span>•</span>
                              <span className="font-mono font-bold text-amber-400" title={`Thường: ${p.basePrice.toLocaleString('vi-VN')}đ\nVIP: ${p.vipPrice?.toLocaleString('vi-VN')}đ\nĐôi: ${p.couplePrice?.toLocaleString('vi-VN')}đ`}>
                                {p.basePrice.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-[#1a2238]/50">
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-white font-bold">{formatTimeOnly(p.startTime)}</span>
                              <span>→</span>
                              <span className="text-gray-400">{formatTimeOnly(p.endTime)}</span>
                              <span className="ml-1 text-gray-600">({formatDateShort(new Date(p.startTime))} {formatWeekday(new Date(p.startTime))})</span>
                            </div>
                            <div className="flex gap-1.5 text-[8px] font-black uppercase text-gray-500">
                              {(p.scoreBreakdown?.weekendScore ?? 0) > 0 && <span className="text-emerald-500/80">Cuối tuần</span>}
                              {(p.scoreBreakdown?.goldenHourScore ?? 0) > 0 && <span className="text-purple-500/80">Giờ vàng</span>}
                              {(p.scoreBreakdown?.genreScore ?? 0) > 4.0 && <span className="text-blue-500/80">HOT Genre</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#1a2238] mt-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAutoPreviewOpen(false)}
                    className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleSaveAuto}
                    disabled={isSavingAuto || selectedPreviewUuids.size === 0}
                    className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs text-white font-bold cursor-pointer transition-colors shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                  >
                    {isSavingAuto ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Đang lưu...
                      </>
                    ) : (
                      <>Lưu {selectedPreviewUuids.size} Suất Chiếu</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
    document.body,
  );
};

export default ShowtimesAutoModal;

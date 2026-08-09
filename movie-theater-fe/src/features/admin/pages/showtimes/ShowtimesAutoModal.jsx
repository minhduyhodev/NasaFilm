import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, CalendarDays, Clock, Settings2, Sparkles, ChevronRight, ChevronLeft,
  CheckCircle2, Building2, Ticket, AlertTriangle,
} from 'lucide-react';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../../shared/utils/mediaUrlUtils';
import { formatWeekday, formatPrice } from './showtimesConstants';
import {
  PUBLISH_MODES,
  getPreviewScoreClass,
  groupPreviewByDate,
  summarizePreview,
  formatPreviewSlot,
} from './showtimesAutoUtils';
import ShowtimesAutoMoviePicker from './ShowtimesAutoMoviePicker';
import { AdminDatePicker } from '../../components';

const STEPS = [
  { id: 'scope', label: 'Phạm vi', icon: Building2 },
  { id: 'params', label: 'Giờ & giá', icon: Clock },
  { id: 'preview', label: 'Xem trước', icon: Sparkles },
];

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const ShowtimesAutoModal = ({
  onClose,
  autoStep,
  setAutoStep,
  autoFormData,
  setAutoFormData,
  systemConfig,
  cinemas,
  rooms,
  isLoadingRooms,
  onCinemaChange,
  movies,
  isLoadingMovies,
  handleAutoAnalyze,
  previewGenerated,
  selectedPreviewUuids,
  setSelectedPreviewUuids,
  togglePreviewSelection,
  handleSaveAuto,
  isAutoLoading,
  isSavingAuto,
}) => {
  const [showWeights, setShowWeights] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const summary = useMemo(
    () => summarizePreview(previewGenerated, selectedPreviewUuids),
    [previewGenerated, selectedPreviewUuids],
  );

  const groupedPreview = useMemo(
    () => groupPreviewByDate(previewGenerated),
    [previewGenerated],
  );

  const canGoParams = autoFormData.roomUuids.length > 0 && autoFormData.movieUuids.length > 0
    && autoFormData.startDate && autoFormData.endDate;

  /** Danh sách mục còn thiếu ở bước Phạm vi — hiển thị cạnh nút "Tiếp theo". */
  const scopeMissing = useMemo(() => {
    const missing = [];
    if (!autoFormData.startDate || !autoFormData.endDate) missing.push('khoảng ngày');
    if (!autoFormData.cinemaUuid) missing.push('rạp');
    if (autoFormData.roomUuids.length === 0) missing.push('phòng chiếu');
    if (autoFormData.movieUuids.length === 0) missing.push('phim');
    return missing;
  }, [autoFormData.startDate, autoFormData.endDate, autoFormData.cinemaUuid, autoFormData.roomUuids, autoFormData.movieUuids]);

  const dayCount = useMemo(() => {
    if (!autoFormData.startDate || !autoFormData.endDate) return 0;
    const start = new Date(`${autoFormData.startDate}T12:00:00`);
    const end = new Date(`${autoFormData.endDate}T12:00:00`);
    const diff = Math.round((end - start) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }, [autoFormData.startDate, autoFormData.endDate]);

  /** Ước lượng thô số suất tối đa: khung giờ / (thời lượng TB + trailer + dọn dẹp). */
  const slotEstimate = useMemo(() => {
    const startMin = toMinutes(autoFormData.startTime);
    const endMin = toMinutes(autoFormData.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) return null;
    const selectedMovies = movies.filter((m) => autoFormData.movieUuids.includes(m.uuid));
    if (selectedMovies.length === 0) return null;
    const avgDuration = selectedMovies.reduce((acc, m) => acc + (m.durationMinutes || 0), 0) / selectedMovies.length;
    const perSlot = avgDuration + (Number(autoFormData.trailerBuffer) || 0) + (Number(autoFormData.intervalMinutes) || 0);
    if (perSlot <= 0) return null;
    const perRoomPerDay = Math.floor((endMin - startMin) / perSlot);
    if (perRoomPerDay <= 0) return null;
    return {
      perRoomPerDay,
      total: perRoomPerDay * autoFormData.roomUuids.length * dayCount,
    };
  }, [autoFormData.startTime, autoFormData.endTime, autoFormData.trailerBuffer, autoFormData.intervalMinutes, autoFormData.movieUuids, autoFormData.roomUuids, movies, dayCount]);

  /** Validates the open window (step "Giờ & giá") and returns a clear Vietnamese
   *  error message, or null when everything is valid. */
  const analyzeValidationError = useMemo(() => {
    if (!canGoParams) return null;
    if (!autoFormData.startTime || !autoFormData.endTime) {
      return 'Vui lòng nhập giờ mở cửa và giờ đóng cửa';
    }
    const startMin = toMinutes(autoFormData.startTime);
    const endMin = toMinutes(autoFormData.endTime);
    if (startMin === null || endMin === null) {
      return 'Giờ mở cửa / đóng cửa không hợp lệ';
    }
    if (endMin <= startMin) {
      return 'Giờ đóng cửa phải sau giờ mở cửa';
    }

    const windowMinutes = endMin - startMin;
    const trailerBuffer = Number(autoFormData.trailerBuffer) || 0;
    const selectedMovies = movies.filter((m) => autoFormData.movieUuids.includes(m.uuid));
    const fitsWindow = selectedMovies.some((m) => {
      const duration = m.durationMinutes || 0;
      return duration > 0 && (duration + trailerBuffer) <= windowMinutes;
    });
    if (selectedMovies.length > 0 && !fitsWindow) {
      return `Khung giờ mở bán (${Math.floor(windowMinutes / 60)}h${windowMinutes % 60}) quá ngắn — không có phim nào (kể cả thời gian trailer) vừa với khung giờ này. Hãy mở rộng giờ hoạt động hoặc chọn phim ngắn hơn.`;
    }
    return null;
  }, [canGoParams, autoFormData.startTime, autoFormData.endTime, autoFormData.trailerBuffer, autoFormData.movieUuids, movies]);

  const canAnalyze = canGoParams && !analyzeValidationError;

  const handleMovieSelectionChange = (movieUuids) => {
    setAutoFormData((prev) => ({ ...prev, movieUuids }));
  };

  const selectAllRooms = () => {
    setAutoFormData((prev) => ({
      ...prev,
      roomUuids: rooms.map((r) => r.uuid),
    }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="st-auto-modal w-full h-[100dvh] sm:h-auto max-h-none sm:max-h-[95vh] sm:max-w-3xl sm:rounded-xl bg-[#090D1A] sm:border sm:border-[#1a2238] border-x-0 border-y-0 shadow-2xl text-left relative overflow-hidden flex flex-col">
        <button
          type="button"
          className="absolute right-4 top-4 z-10 p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        <header className="px-6 pt-6 pb-4 border-b border-[#1a2238] shrink-0">
          <div className="flex items-center gap-2 mb-4 pr-8">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <CalendarDays className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Lập lịch suất chiếu thông minh</h2>
              <p className="text-[10px] text-gray-500">Thuật toán ưu tiên theo cấu hình hệ thống — xem trước trước khi xuất vé</p>
            </div>
          </div>

          <div className="st-auto-steps">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const active = autoStep === idx;
              const done = autoStep > idx;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`st-auto-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                  onClick={() => {
                    if (idx === 1 && !canGoParams) return;
                    if (idx === 2 && previewGenerated.length === 0) return;
                    setAutoStep(idx);
                  }}
                >
                  <span className="st-auto-step__icon">
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {autoStep === 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="st-auto-label mb-0">Khoảng ngày áp dụng *</label>
                  {dayCount > 0 && (
                    <span className="text-[10px] font-bold text-amber-400">{dayCount} ngày</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AdminDatePicker
                    label="Ngày bắt đầu"
                    value={autoFormData.startDate}
                    onChange={(v) => setAutoFormData((prev) => ({ ...prev, startDate: v }))}
                    max={autoFormData.endDate || undefined}
                  />
                  <AdminDatePicker
                    label="Ngày kết thúc"
                    value={autoFormData.endDate}
                    onChange={(v) => setAutoFormData((prev) => ({ ...prev, endDate: v }))}
                    min={autoFormData.startDate || undefined}
                  />
                </div>
              </div>

              <div>
                <label className="st-auto-label">Rạp chiếu *</label>
                <select
                  className="st-auto-input"
                  value={autoFormData.cinemaUuid}
                  onChange={(e) => onCinemaChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn rạp --</option>
                  {cinemas.map((c) => (
                    <option key={c.uuid} value={c.uuid}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="st-auto-label mb-0">Phòng chiếu *</label>
                  {rooms.length > 0 && (
                    <button type="button" className="st-auto-link" onClick={selectAllRooms}>
                      Chọn tất cả ({rooms.length})
                    </button>
                  )}
                </div>
                <div className="st-auto-check-grid">
                  {isLoadingRooms ? (
                    <span className="text-[10px] text-gray-500 col-span-2">Đang tải phòng...</span>
                  ) : rooms.length === 0 ? (
                    <span className="text-[10px] text-gray-500 col-span-2">Chọn rạp để hiển thị phòng</span>
                  ) : (
                    rooms.map((room) => (
                      <label key={room.uuid} className="st-auto-check">
                        <input
                          type="checkbox"
                          checked={autoFormData.roomUuids.includes(room.uuid)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setAutoFormData((prev) => ({
                              ...prev,
                              roomUuids: checked
                                ? [...prev.roomUuids, room.uuid]
                                : prev.roomUuids.filter((id) => id !== room.uuid),
                            }));
                          }}
                          className="st-checkbox"
                        />
                        <span>{room.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <ShowtimesAutoMoviePicker
                movies={movies}
                selectedUuids={autoFormData.movieUuids}
                onChange={handleMovieSelectionChange}
                isLoading={isLoadingMovies}
              />
            </div>
          )}

          {autoStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="st-auto-label">Giờ mở cửa</label>
                  <input type="time" className="st-auto-input" value={autoFormData.startTime}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="st-auto-label">Giờ đóng cửa</label>
                  <input type="time" className="st-auto-input" value={autoFormData.endTime}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, endTime: e.target.value }))} />
                </div>
                <div>
                  <label className="st-auto-label">Dọn dẹp (phút)</label>
                  <input type="number" min="0" max="120" className="st-auto-input" value={autoFormData.intervalMinutes}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, intervalMinutes: parseInt(e.target.value, 10) || 15 }))} />
                </div>
                <div>
                  <label className="st-auto-label">Trailer buffer (phút)</label>
                  <input type="number" min="0" max="60" className="st-auto-input" value={autoFormData.trailerBuffer}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, trailerBuffer: parseInt(e.target.value, 10) || 10 }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="stcm-price">
                  <label className="st-auto-label">Vé thường (đ)</label>
                  <input type="number" step="5000" className="st-auto-input font-mono" value={autoFormData.basePrice}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, basePrice: parseInt(e.target.value, 10) || prev.basePrice }))} />
                  <span className="stcm-price__hint">{formatPrice(Number(autoFormData.basePrice) || 0)}</span>
                </div>
                <div className="stcm-price">
                  <label className="st-auto-label">Vé VIP (đ)</label>
                  <input type="number" step="5000" className="st-auto-input font-mono" value={autoFormData.vipPrice}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, vipPrice: parseInt(e.target.value, 10) || prev.vipPrice }))} />
                  <span className="stcm-price__hint">{formatPrice(Number(autoFormData.vipPrice) || 0)}</span>
                </div>
                <div className="stcm-price">
                  <label className="st-auto-label">Vé đôi (đ)</label>
                  <input type="number" step="5000" className="st-auto-input font-mono" value={autoFormData.couplePrice}
                    onChange={(e) => setAutoFormData((prev) => ({ ...prev, couplePrice: parseInt(e.target.value, 10) || prev.couplePrice }))} />
                  <span className="stcm-price__hint">{formatPrice(Number(autoFormData.couplePrice) || 0)}</span>
                </div>
              </div>

              {!analyzeValidationError && slotEstimate && (
                <div className="stcm-check stcm-check--ok">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Ước tính tối đa <strong>~{slotEstimate.perRoomPerDay} suất/phòng/ngày</strong>
                    {' '}→ khoảng <strong>~{slotEstimate.total} suất</strong> cho{' '}
                    {autoFormData.roomUuids.length} phòng × {dayCount} ngày. Thuật toán sẽ chọn khung giờ tối ưu trong giới hạn này.
                  </span>
                </div>
              )}

              {analyzeValidationError && (
                <div className="stcm-check stcm-check--error">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{analyzeValidationError}</span>
                </div>
              )}

              <div className="st-auto-config-panel">
                <button
                  type="button"
                  className="st-auto-config-toggle"
                  onClick={() => setShowWeights((v) => !v)}
                >
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trọng số thuật toán (từ Cấu hình hệ thống)</span>
                  <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${showWeights ? 'rotate-90' : ''}`} />
                </button>
                {showWeights && (
                  <div className="st-auto-config-grid">
                    <span>Giờ vàng <strong>{autoFormData.goldenHourWeight}x</strong></span>
                    <span>Cuối tuần <strong>{autoFormData.weekendWeight}x</strong></span>
                    <span>Đánh giá <strong>{autoFormData.ratingWeight}x</strong></span>
                    <span>Thể loại <strong>{autoFormData.genreWeight}x</strong></span>
                    <span>Bước slot <strong>{systemConfig?.slotStepMinutes ?? 30} phút</strong></span>
                    <span>Lưới giờ <strong>{systemConfig?.gridAlignMinutes ?? 15} phút</strong></span>
                    <span>Giờ vàng <strong>{systemConfig?.goldenHourPeakStart}–{systemConfig?.goldenHourPeakEnd}</strong></span>
                    <span className="text-gray-500 text-[10px] col-span-2">Chỉnh trong Admin → Cấu hình → Suất chiếu</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {autoStep === 2 && (
            <div className="space-y-4">
              <div className="st-auto-summary">
                <div><span className="text-gray-500">Gợi ý</span><strong>{summary.total}</strong></div>
                <div><span className="text-gray-500">Đã chọn</span><strong className="text-amber-400">{summary.selectedCount}</strong></div>
                <div><span className="text-gray-500">Phim</span><strong>{summary.movieCount}</strong></div>
                <div><span className="text-gray-500">Phòng</span><strong>{summary.roomCount}</strong></div>
                <div><span className="text-gray-500">Ngày</span><strong>{summary.dayCount}</strong></div>
                <div><span className="text-gray-500">Điểm TB</span><strong>{summary.avgScore}</strong></div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
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
                  Chọn tất cả
                </label>
              </div>

              <div className="space-y-4 max-h-[38vh] overflow-y-auto pr-1 custom-scrollbar">
                {groupedPreview.map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <h3 className="st-auto-date-head">{dateLabel}</h3>
                    <div className="space-y-2">
                      {items.map((p) => {
                        const idx = p._index;
                        const isSelected = selectedPreviewUuids.has(idx);
                        const pillColor = getPreviewScoreClass(p.priorityScore, systemConfig);
                        const genreBase = systemConfig?.genreTierBase ?? 4;

                        return (
                          <div
                            key={idx}
                            className={`st-auto-preview-card ${isSelected ? 'is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePreviewSelection(idx)}
                              className="st-checkbox cursor-pointer mt-1"
                            />
                            <div className="w-9 h-12 rounded overflow-hidden bg-[#0F1322] border border-[#1a2238] shrink-0">
                              <img
                                src={getPosterSrc(p.moviePosterUrl, 80)}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={handlePosterError}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-black text-white text-xs truncate">{p.movieTitle}</h4>
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    {p.cinemaRoomName} · {formatPreviewSlot(p)} · {formatWeekday(new Date(p.startTime))}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded border text-[10px] font-black font-mono shrink-0 ${pillColor}`}>
                                  {p.priorityScore.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-1 text-[8px] font-black uppercase text-gray-500">
                                {(p.scoreBreakdown?.weekendScore ?? 0) > 0 && <span className="text-emerald-500/80">Cuối tuần</span>}
                                {(p.scoreBreakdown?.goldenHourScore ?? 0) > 0 && <span className="text-purple-500/80">Giờ vàng</span>}
                                {(p.scoreBreakdown?.genreScore ?? 0) > genreBase && <span className="text-blue-500/80">Genre hot</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="st-auto-publish">
                <p className="st-auto-label mb-2">Sau khi lưu</p>
                <div className="space-y-2">
                  {PUBLISH_MODES.map((mode) => (
                    <label key={mode.value} className={`st-auto-publish-option ${autoFormData.publishStatus === mode.value ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="publishStatus"
                        value={mode.value}
                        checked={autoFormData.publishStatus === mode.value}
                        onChange={() => setAutoFormData((prev) => ({ ...prev, publishStatus: mode.value }))}
                      />
                      <div>
                        <span className="font-bold text-white text-xs">{mode.label}</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">{mode.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[#1a2238] flex items-center justify-between gap-3 shrink-0 bg-[#090D1A]">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={onClose} className="st-auto-btn st-auto-btn--ghost">
              Hủy
            </button>
            {autoStep === 0 && scopeMissing.length > 0 && (
              <span className="text-[10px] text-gray-500 truncate">
                Còn thiếu: <span className="text-amber-400 font-bold">{scopeMissing.join(', ')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {autoStep > 0 && (
              <button
                type="button"
                className="st-auto-btn st-auto-btn--ghost"
                onClick={() => setAutoStep((s) => s - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Quay lại
              </button>
            )}

            {autoStep < 2 && (
              <button
                type="button"
                disabled={autoStep === 0 ? !canGoParams : !canAnalyze}
                className="st-auto-btn st-auto-btn--primary"
                onClick={() => {
                  if (autoStep === 1) {
                    handleAutoAnalyze();
                  } else {
                    setAutoStep((s) => s + 1);
                  }
                }}
              >
                {autoStep === 1 ? (
                  isAutoLoading ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Phân tích & xem trước
                    </>
                  )
                ) : (
                  <>
                    Tiếp theo
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {autoStep === 2 && (
              <button
                type="button"
                disabled={isSavingAuto || selectedPreviewUuids.size === 0}
                className="st-auto-btn st-auto-btn--primary"
                onClick={handleSaveAuto}
              >
                {isSavingAuto ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Ticket className="w-3.5 h-3.5" />
                    Lưu {selectedPreviewUuids.size} suất
                    {autoFormData.publishStatus === 'OPEN_FOR_BOOKING' ? ' & mở bán' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default ShowtimesAutoModal;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Clock,
  Film,
  Loader2,
  MapPin,
  QrCode,
  Radio,
  Rocket,
  Ticket,
  Users,
} from 'lucide-react';
import { AdminPage, PageHeader } from '../components';
import { staffMissionService } from '../api/staffMissionService';
import { bookingService } from '../../../shared/services/bookingService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { stompSocketService, SEAT_MAP_REFRESH_MS } from '../../../shared/services/stompSocketService';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrlUtils';
import TabTransition from '../../../shared/components/TabTransition';
import LiveSeatMapView from '../../../shared/components/seatmap/LiveSeatMapView';
import StaffQrScanner, { canUseQrScanner } from '../../../shared/components/qr/StaffQrScanner';
import StaffMissionStatsKpi from './staff/StaffMissionStatsKpi';
import './StaffMissionControlPage.css';

const formatShowtime = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const formatShowtimeParts = (iso) => {
  if (!iso) return { time: '—', date: '—' };
  const date = new Date(iso);
  return {
    time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };
};

const ShowtimePoster = ({ posterUrl, title, size = 'card' }) => {
  const [failed, setFailed] = useState(false);
  const src = posterUrl && !failed ? resolveMediaUrl(posterUrl, size === 'hero' ? 400 : 160) : '';

  if (!src) {
    return (
      <div className={`staff-control__poster staff-control__poster--fallback staff-control__poster--${size}`} aria-hidden="true">
        <Film className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title ? `Poster ${title}` : 'Poster phim'}
      className={`staff-control__poster staff-control__poster--${size}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const WelcomeAboardModal = ({ result, onClose }) => {
  if (!result) return null;

  return (
    <div className="staff-control__welcome-overlay" role="dialog" aria-modal="true">
      <div className="staff-control__welcome-card">
        <div className="staff-control__welcome-icon">
          <Rocket className="w-8 h-8" />
        </div>
        <h2 className="staff-control__welcome-title">Welcome Aboard</h2>
        <p className="staff-control__welcome-sub">
          {result.alreadyCheckedIn ? 'Vé đã được soát trước đó' : 'Khách hàng đã check-in thành công'}
        </p>
        <div className="staff-control__welcome-details">
          <p><strong>Khách:</strong> {result.customerName || '—'}</p>
          <p><strong>Phim:</strong> {result.movieTitle || '—'}</p>
          <p><strong>Suất:</strong> {result.showtimeDisplay || '—'}</p>
          <p><strong>Ghế:</strong> {(result.seatLabels || []).join(', ') || '—'}</p>
          <p><strong>Mã vé:</strong> {result.ticketCode}</p>
        </div>
        <button type="button" className="staff-control__btn staff-control__btn--primary w-full" onClick={onClose}>
          Tiếp tục soát vé
        </button>
      </div>
    </div>
  );
};

const pickDefaultShowtimeUuid = (list, previousUuid) => {
  if (previousUuid && list.some((s) => s.showtimeUuid === previousUuid)) {
    return previousUuid;
  }
  const withSales = list.find((s) => (s.soldSeats ?? 0) > 0);
  return withSales?.showtimeUuid || list[0]?.showtimeUuid || '';
};

const StaffMissionControlPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [showtimeSearch, setShowtimeSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [ticketPreview, setTicketPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [welcomeResult, setWelcomeResult] = useState(null);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const qrScannerAvailable = canUseQrScanner();

  const loadShowtimes = useCallback(async () => {
    setLoadError('');
    try {
      const data = await staffMissionService.getOperationalShowtimes();
      const list = Array.isArray(data) ? data : [];
      setShowtimes(list);
      setSelectedUuid((prev) => pickDefaultShowtimeUuid(list, prev));
    } catch (err) {
      setShowtimes([]);
      setLoadError(err?.message || 'Không thể tải danh sách suất chiếu');
    } finally {
      setLoadingShowtimes(false);
    }
  }, []);

  const loadRecentGateEvents = useCallback(async (showtimeUuid) => {
    if (!showtimeUuid) {
      setRecentCheckIns([]);
      return;
    }
    try {
      const data = await staffMissionService.getRecentGateEvents(showtimeUuid, 10);
      setRecentCheckIns(Array.isArray(data) ? data : []);
    } catch {
      setRecentCheckIns([]);
    }
  }, []);

  const loadDetail = useCallback(async (showtimeUuid) => {
    if (!showtimeUuid) {
      setStats(null);
      setSeatMap(null);
      setRecentCheckIns([]);
      return;
    }

    setLoadingDetail(true);
    setDetailError('');
    try {
      const [statsData, mapData] = await Promise.all([
        staffMissionService.getShowtimeStats(showtimeUuid),
        bookingService.getSeatMap(showtimeUuid),
      ]);
      setStats(statsData);
      setSeatMap(mapData);
      bookingService.watchSeatMap(showtimeUuid).catch(() => {});
      await loadRecentGateEvents(showtimeUuid);
    } catch (err) {
      setStats(null);
      setSeatMap(null);
      setDetailError(err?.message || 'Không thể tải sơ đồ ghế / thống kê suất chiếu');
    } finally {
      setLoadingDetail(false);
    }
  }, [loadRecentGateEvents]);

  useEffect(() => {
    loadShowtimes();
  }, [loadShowtimes]);

  useEffect(() => {
    loadDetail(selectedUuid);
    return () => {
      if (selectedUuid) {
        bookingService.unwatchSeatMap(selectedUuid).catch(() => {});
      }
    };
  }, [selectedUuid, loadDetail]);

  useRealtimeTopic(
    selectedUuid ? REALTIME_TOPICS.showtimeSeats(selectedUuid) : null,
    () => loadDetail(selectedUuid),
  );

  useRealtimeTopic(REALTIME_TOPICS.STAFF_CHECK_IN, () => {
    if (selectedUuid) {
      loadDetail(selectedUuid);
      loadRecentGateEvents(selectedUuid);
    }
    loadShowtimes();
  });

  useEffect(() => {
    if (!selectedUuid) return undefined;

    const pollId = window.setInterval(() => {
      loadDetail(selectedUuid);
    }, SEAT_MAP_REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        stompSocketService.ensureConnected();
        loadDetail(selectedUuid);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [selectedUuid, loadDetail]);

  const scanSourceRef = useRef('manual');

  const handleQrScan = useCallback((code) => {
    scanSourceRef.current = 'camera';
    setTicketCode(code);
    setScannerError('');
  }, []);

  const handleScannerError = useCallback((message) => {
    setScannerError(message);
    setScanning(false);
  }, []);

  const toggleScanner = useCallback(() => {
    if (scanning) {
      setScanning(false);
      setScannerError('');
      return;
    }
    setScannerError('');
    setScanning(true);
  }, [scanning]);

  useEffect(() => {
    const code = ticketCode.trim();
    if (!code || code.length < 4) {
      setTicketPreview(null);
      setPreviewError('');
      return undefined;
    }

    let cancelled = false;
    const fromCamera = scanSourceRef.current === 'camera';
    scanSourceRef.current = 'manual';
    const delay = fromCamera ? 0 : 350;

    const timerId = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError('');
      const scanSource = fromCamera ? 'CAMERA' : 'MANUAL';
      try {
        const data = await staffMissionService.previewTicket(code, scanSource);
        if (!cancelled) {
          setTicketPreview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setTicketPreview(null);
          setPreviewError(err?.message || 'Không tìm thấy vé');
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [ticketCode]);

  const handleCheckIn = async (event) => {
    event.preventDefault();
    const code = ticketCode.trim();
    if (!code) return;

    setCheckingIn(true);
    const scanSource = scanSourceRef.current === 'camera' ? 'CAMERA' : 'MANUAL';
    try {
      const { data } = await staffMissionService.checkInTicket(code, scanSource);
      setWelcomeResult(data);
      setTicketCode('');
      setTicketPreview(null);
      setPreviewError('');
      if (selectedUuid) {
        loadDetail(selectedUuid);
        loadRecentGateEvents(selectedUuid);
      } else if (data?.showtimeUuid) {
        loadRecentGateEvents(data.showtimeUuid);
      }
      loadShowtimes();
    } catch (error) {
      const message = error?.message || 'Không thể soát vé';
      window.alert(message);
    } finally {
      setCheckingIn(false);
    }
  };

  const selectedShowtime = showtimes.find((s) => s.showtimeUuid === selectedUuid);
  const searchTerm = showtimeSearch.trim().toLowerCase();
  const filteredShowtimes = searchTerm
    ? showtimes.filter((s) => {
        const haystack = `${s.movieTitle} ${s.cinemaName} ${s.roomName}`.toLowerCase();
        return haystack.includes(searchTerm);
      })
    : showtimes;
  const showtimesWithSales = showtimes.filter((s) => (s.soldSeats ?? 0) > 0).length;

  return (
    <TabTransition>
      <AdminPage className="staff-control">
        <PageHeader
          eyebrow="Trung tâm vận hành rạp"
          title="Staff Mission Control"
          description="Soát vé, giám sát ghế trực tiếp và vận hành suất chiếu "
          variant="display"
        />

        {loadingShowtimes ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang tải suất chiếu...
          </div>
        ) : (
          <div className="staff-control__grid">
            {/* Live seat map */}
            <section className="staff-control__panel staff-control__panel--map">
              <h2 className="staff-control__panel-title">Sơ đồ ghế trực tiếp</h2>

              {selectedShowtime && (
                <div className="staff-control__showtime-header">
                  <ShowtimePoster
                    posterUrl={selectedShowtime.posterUrl}
                    title={selectedShowtime.movieTitle}
                  />
                  <div className="staff-control__showtime-header-info">
                    <h3 className="staff-control__showtime-header-title">{selectedShowtime.movieTitle}</h3>
                    <p className="staff-control__showtime-header-meta">
                      {formatShowtime(selectedShowtime.startTime)}
                    </p>
                    <p className="staff-control__showtime-header-meta">
                      {selectedShowtime.cinemaName} · {selectedShowtime.roomName}
                    </p>
                  </div>
                </div>
              )}

              {stats?.almostFull && (
                <div className="staff-control__alert-banner" role="alert">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Cảnh báo: Suất {selectedShowtime?.movieTitle} đã bán {stats.occupancyPercent}% — còn {stats.availableSeats} ghế!
                </div>
              )}

              {detailError && (
                <div className="staff-control__alert-banner staff-control__alert-banner--warn" role="alert">
                  {detailError}
                </div>
              )}

              {loadingDetail && !seatMap ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang tải sơ đồ...
                </div>
              ) : !selectedUuid ? (
                <p className="staff-control__empty">Chọn suất chiếu để xem sơ đồ ghế.</p>
              ) : (
                <>
                  <StaffMissionStatsKpi stats={stats} />

                  <div className="staff-control__seat-map-wrap">
                    <LiveSeatMapView
                      rows={seatMap?.rows || []}
                      layoutConfig={seatMap?.layoutConfig}
                      showLegend
                      compact
                    />
                  </div>
                </>
              )}
            </section>

            <div className="staff-control__sidebar">
            {/* Check-in panel */}
            <aside className="staff-control__panel staff-control__panel--checkin">
              <h2 className="staff-control__panel-title">
                <QrCode className="w-3.5 h-3.5" />
                Soát vé QR
              </h2>

              <StaffQrScanner
                active={scanning}
                onScan={handleQrScan}
                onError={handleScannerError}
              />

              {scannerError && (
                <p className="staff-control__scanner-error">{scannerError}</p>
              )}

              <form className="staff-control__checkin-form" onSubmit={handleCheckIn}>
                <input
                  type="text"
                  className="staff-control__input"
                  placeholder="Nhập hoặc quét mã vé..."
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />

                {previewLoading && (
                  <p className="text-[0.65rem] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Đang tra cứu vé...
                  </p>
                )}

                {previewError && !previewLoading && (
                  <p className="text-[0.65rem] text-red-400">{previewError}</p>
                )}

                {ticketPreview && !previewLoading && (
                  <div className="staff-control__preview-card">
                    <p className="staff-control__preview-title">
                      {ticketPreview.alreadyCheckedIn ? 'Vé đã soát' : 'Thông tin vé'}
                    </p>
                    <p><strong>{ticketPreview.customerName}</strong></p>
                    <p>{ticketPreview.movieTitle}</p>
                    <p>{ticketPreview.showtimeDisplay || '—'}</p>
                    <p>Ghế: {(ticketPreview.seatLabels || []).join(', ') || '—'}</p>
                    {ticketPreview.alreadyCheckedIn && (
                      <p className="staff-control__preview-warn">Vé này đã được check-in trước đó.</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="staff-control__btn staff-control__btn--secondary flex-1"
                    onClick={toggleScanner}
                    disabled={!qrScannerAvailable}
                    title={
                      qrScannerAvailable
                        ? 'Quét QR bằng camera (webcam / điện thoại)'
                        : 'Cần HTTPS hoặc localhost và trình duyệt hỗ trợ camera'
                    }
                  >
                    {scanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {scanning ? 'Tắt camera' : 'Quét QR'}
                  </button>
                  <button
                    type="submit"
                    className="staff-control__btn staff-control__btn--primary flex-1"
                    disabled={checkingIn || !ticketCode.trim() || previewLoading || Boolean(previewError)}
                  >
                    {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    Soát vé
                  </button>
                </div>
              </form>

              {stats?.topCombos?.length > 0 && (
                <div className="mt-4">
                  <h3 className="staff-control__panel-title">Combo bán chạy</h3>
                  <div className="staff-control__combo-list">
                    {stats.topCombos.map((combo) => (
                      <div key={combo.comboName} className="staff-control__combo-item">
                        <span>{combo.comboName}</span>
                        <span className="font-bold text-white">{combo.quantitySold}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentCheckIns.length > 0 && (
                <div className="staff-control__recent-checkins">
                  <h3 className="staff-control__panel-title">
                    <Radio className="w-3.5 h-3.5 inline mr-1" />
                    Check-in gần đây
                  </h3>
                  {recentCheckIns.map((item) => {
                    const at = item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '—';
                    const isDuplicate = item.eventType === 'TICKET_CHECK_IN_ALREADY_USED';
                    return (
                      <div key={item.eventUuid} className="staff-control__recent-item">
                        <Users className="w-3 h-3 inline mr-1 opacity-60" />
                        {item.customerName ? `${item.customerName} · ` : ''}
                        {item.ticketCode} · {at}
                        {isDuplicate ? ' · đã soát' : ''}
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* Showtime picker — ngay dưới Soát vé QR */}
            <aside className="staff-control__panel staff-control__panel--showtimes">
              <div className="staff-control__panel-head">
                <h2 className="staff-control__panel-title">
                  <Film className="w-3.5 h-3.5" />
                  Suất đang vận hành
                </h2>
                {showtimesWithSales > 0 && (
                  <span className="staff-control__panel-badge">{showtimesWithSales} suất có vé</span>
                )}
              </div>
              {showtimesWithSales > 0 && (
                <p className="staff-control__sales-hint">
                  Chọn suất có vé để xem sơ đồ ghế trực tiếp.
                </p>
              )}
              {showtimes.length > 3 && (
                <input
                  type="search"
                  className="staff-control__input staff-control__search"
                  placeholder="Lọc theo phim, rạp, phòng..."
                  value={showtimeSearch}
                  onChange={(e) => setShowtimeSearch(e.target.value)}
                />
              )}
              {showtimes.length === 0 ? (
                <div className="staff-control__empty">
                  {loadError ? (
                    <p>{loadError}</p>
                  ) : (
                    <p>Không có suất mở bán trong 4 ngày tới (giống tab ngày trên trang đặt vé).</p>
                  )}
                </div>
              ) : filteredShowtimes.length === 0 ? (
                <div className="staff-control__empty">
                  <p>Không có suất khớp bộ lọc &quot;{showtimeSearch}&quot;.</p>
                </div>
              ) : (
                <div className="staff-control__showtime-list">
                  {filteredShowtimes.map((showtime, index) => {
                    const isActive = showtime.showtimeUuid === selectedUuid;
                    const hasSales = (showtime.soldSeats ?? 0) > 0;
                    const { time, date } = formatShowtimeParts(showtime.startTime);
                    return (
                      <button
                        key={showtime.showtimeUuid}
                        type="button"
                        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                        className={`staff-control__showtime-card ${isActive ? 'staff-control__showtime-card--active' : ''} ${showtime.almostFull ? 'staff-control__showtime-card--alert' : ''} ${hasSales ? 'staff-control__showtime-card--has-sales' : ''}`}
                        onClick={() => setSelectedUuid(showtime.showtimeUuid)}
                      >
                        <div className="staff-control__showtime-poster-wrap">
                          <ShowtimePoster posterUrl={showtime.posterUrl} title={showtime.movieTitle} />
                          {hasSales && (
                            <span className="staff-control__poster-live">Đang bán</span>
                          )}
                        </div>
                        <div className="staff-control__showtime-content">
                          <h3 className="staff-control__showtime-movie">{showtime.movieTitle}</h3>
                          <div className="staff-control__showtime-chips">
                            <span className="staff-control__chip staff-control__chip--time">
                              <Clock className="w-3 h-3" />
                              {time}
                            </span>
                            <span className="staff-control__chip">{date}</span>
                          </div>
                          <p className="staff-control__showtime-meta">
                            <MapPin className="w-3 h-3 inline opacity-60" />
                            {showtime.cinemaName} · {showtime.roomName}
                          </p>
                          <div className="staff-control__occupancy">
                            <div className="staff-control__occupancy-bar">
                              <div
                                className={`staff-control__occupancy-fill ${showtime.almostFull ? 'staff-control__occupancy-fill--danger' : ''}`}
                                style={{ width: `${Math.min(100, showtime.occupancyPercent)}%` }}
                              />
                            </div>
                            <span className="staff-control__occupancy-pct">{showtime.occupancyPercent}%</span>
                          </div>
                          {hasSales && (
                            <div className="staff-control__sold-badge">
                              {showtime.soldSeats} ghế đã bán
                            </div>
                          )}
                          {showtime.almostFull && (
                            <div className="staff-control__alert-inline">
                              <AlertTriangle className="w-3 h-3" />
                              Sắp full
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>
            </div>
          </div>
        )}

        <WelcomeAboardModal result={welcomeResult} onClose={() => setWelcomeResult(null)} />
      </AdminPage>
    </TabTransition>
  );
};

export default StaffMissionControlPage;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Film,
  Loader2,
  Radio,
  Users,
  Volume2,
  VolumeX,
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
import StaffMissionStatsKpi from './staff/StaffMissionStatsKpi';
import { useStaffTicketCheckIn } from './staff/useStaffTicketCheckIn';
import {
  StaffTicketCheckInForm,
  StaffTicketScanResult,
} from './staff/StaffTicketCheckInPanel';
import StaffCheckInSessionHistory from './staff/StaffCheckInSessionHistory';
import StaffShowtimePicker, { toDateKey } from './staff/StaffShowtimePicker';
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
  const [filters, setFilters] = useState({
    cinema: '', room: '', date: '', timeSlot: '', movie: '',
  });
  const [stats, setStats] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const checkinFooterRef = useRef(null);

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

  const handleCheckInComplete = useCallback((data) => {
    if (data?.showtimeUuid) {
      setSelectedUuid(data.showtimeUuid);
      loadDetail(data.showtimeUuid);
      loadRecentGateEvents(data.showtimeUuid);
    } else if (selectedUuid) {
      loadDetail(selectedUuid);
      loadRecentGateEvents(selectedUuid);
    }
    loadShowtimes();
  }, [loadDetail, loadRecentGateEvents, loadShowtimes, selectedUuid]);

  const checkIn = useStaffTicketCheckIn({
    audioEnabled,
    onCheckInComplete: handleCheckInComplete,
    gateShowtimeUuid: selectedUuid,
  });

  useEffect(() => {
    if (!checkIn.isResultPanelActive && !checkIn.isHistoryActive) return;
    // Only auto-scroll on successful check-in / history growth — avoid loop on wrong QR rescans.
    if (checkIn.previewError) return;
    checkinFooterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [checkIn.displayResult?.code, checkIn.displayResult?.status, checkIn.scanHistory.length, checkIn.isResultPanelActive, checkIn.isHistoryActive, checkIn.previewError]);

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

  const selectedShowtime = showtimes.find((s) => s.showtimeUuid === selectedUuid);

  const filteredShowtimes = useMemo(() => showtimes.filter((s) => {
    if (filters.cinema && s.cinemaName !== filters.cinema) return false;
    if (filters.room && s.roomName !== filters.room) return false;
    if (filters.date && toDateKey(s.startTime) !== filters.date) return false;
    if (filters.timeSlot) {
      const time = new Date(s.startTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (time !== filters.timeSlot) return false;
    }
    const movieTerm = filters.movie.trim().toLowerCase();
    if (movieTerm && !`${s.movieTitle || ''}`.toLowerCase().includes(movieTerm)) return false;
    return true;
  }), [showtimes, filters]);

  const hasActiveFilters = Boolean(
    filters.cinema || filters.room || filters.date || filters.timeSlot || filters.movie.trim(),
  );

  const showtimesWithSales = showtimes.filter((s) => (s.soldSeats ?? 0) > 0).length;

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'cinema') {
        next.room = '';
        next.date = '';
        next.timeSlot = '';
        next.movie = '';
      } else if (key === 'room') {
        next.date = '';
        next.timeSlot = '';
        next.movie = '';
      } else if (key === 'date') {
        next.timeSlot = '';
        next.movie = '';
      } else if (key === 'timeSlot') {
        next.movie = '';
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ cinema: '', room: '', date: '', timeSlot: '', movie: '' });
  }, []);

  return (
    <TabTransition>
      <AdminPage className="staff-control">
        <PageHeader
          eyebrow="Trung tâm vận hành rạp"
          title="Soát vé & giám sát suất chiếu"
          description="Soát vé QR, giám sát ghế trực tiếp và vận hành suất chiếu trên một màn hình."
          variant="display"
          secondaryActions={[
            {
              label: `Âm thanh: ${audioEnabled ? 'BẬT (TTS)' : 'TẮT'}`,
              icon: audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />,
              onClick: () => setAudioEnabled((prev) => !prev),
            },
          ]}
        />

        {loadingShowtimes ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang tải suất chiếu...
          </div>
        ) : (
          <>
            <StaffShowtimePicker
              showtimes={showtimes}
              filteredShowtimes={filteredShowtimes}
              selectedUuid={selectedUuid}
              onSelect={setSelectedUuid}
              loadError={loadError}
              showtimesWithSales={showtimesWithSales}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
              ShowtimePoster={ShowtimePoster}
            />

            <div className="staff-control__grid">
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
                        variant="staff"
                      />
                    </div>
                  </>
                )}
              </section>

              <div className="staff-control__sidebar">
                <StaffTicketCheckInForm
                  ticketCode={checkIn.ticketCode}
                  setTicketCode={checkIn.setTicketCode}
                  ticketPreview={checkIn.ticketPreview}
                  previewLoading={checkIn.previewLoading}
                  previewError={checkIn.previewError}
                  checkingIn={checkIn.checkingIn}
                  scanning={checkIn.scanning}
                  scannerError={checkIn.scannerError}
                  onQrScan={checkIn.handleQrScan}
                  onScannerError={checkIn.handleScannerError}
                  onToggleScanner={checkIn.toggleScanner}
                  onCheckIn={checkIn.handleCheckIn}
                  showCameraPlaceholder
                />

                {stats?.topCombos?.length > 0 && (
                  <aside className="staff-control__panel">
                    <h3 className="staff-control__panel-title">Combo bán chạy</h3>
                    <div className="staff-control__combo-list">
                      {stats.topCombos.map((combo) => (
                        <div key={combo.comboName} className="staff-control__combo-item">
                          <span>{combo.comboName}</span>
                          <span className="font-bold text-white">{combo.quantitySold}x</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                )}

                {recentCheckIns.length > 0 && (
                  <aside className="staff-control__panel staff-control__panel--gate-events">
                    <h3 className="staff-control__panel-title">
                      <Radio className="w-3.5 h-3.5 inline mr-1" />
                      Check-in gần đây (suất)
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
                  </aside>
                )}

              </div>
            </div>

            <div className="staff-control__checkin-footer" ref={checkinFooterRef}>
              <StaffTicketScanResult
                result={checkIn.displayResult}
                loading={checkIn.previewLoading && checkIn.ticketCode.trim().length >= 4}
                active={checkIn.isResultPanelActive}
              />
              <StaffCheckInSessionHistory
                items={checkIn.scanHistory}
                active={checkIn.isHistoryActive}
              />
            </div>
          </>
        )}
      </AdminPage>
    </TabTransition>
  );
};

export default StaffMissionControlPage;

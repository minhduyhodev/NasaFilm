import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { hasPermission, PERMISSIONS } from '../../../shared/utils/permissions';
import {
  Ticket, Popcorn, User, Search, UserPlus, Loader2,
  CreditCard, Banknote, QrCode, Check, ShoppingCart, Printer, X,
} from 'lucide-react';
import { counterService } from '../api/counterService';
import { comboService } from '../../../shared/services/comboService';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { useSeatMapState } from '../../../shared/hooks/useSeatMapState';
import TheaterSeatMapPanel from '../../../shared/components/seatmap/TheaterSeatMapPanel';
import { CounterPageHeader, PrintTicketModal } from '../components/CounterStaffUI';
import CounterPosShowtimeFilters from '../components/CounterPosShowtimeFilters';
import { resolveMediaUrl, handlePosterError } from '../../../shared/utils/mediaUrlUtils';
import { applyShowtimeFilters } from '../../../shared/utils/showtimeFilterUtils';
import '../styles/counter-staff-theme.css';
import '../../home/pages/BookingPage.css';

export default function CounterPOSPage() {
  const { user } = useAuthContext();
  const canCreateBooking = hasPermission(user, PERMISSIONS.COUNTER_BOOKING_CREATE);
  const canAddCombos = hasPermission(user, PERMISSIONS.COUNTER_COMBO_CREATE);
  const canCreateCustomer = hasPermission(user, PERMISSIONS.COUNTER_CUSTOMER_CREATE);

  const [locationVersion, setLocationVersion] = useState(0);
  const currentCinemaUuid = useMemo(
    () => localStorage.getItem('counter_cinema_uuid'),
    [locationVersion],
  );
  const currentRoomUuid = useMemo(
    () => localStorage.getItem('counter_room_uuid') || '',
    [locationVersion],
  );

  // Core POS selections
  const [movies, setMovies] = useState([]);
  const [allShowtimes, setAllShowtimes] = useState([]);
  const [filters, setFilters] = useState({ date: '', timeSlot: '', movieUuid: '' });
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  const [combos, setCombos] = useState([]);
  const [selectedCombos, setSelectedCombos] = useState({}); // comboUuid -> quantity

  // Customer Management
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: '', email: '', phoneNumber: '' });

  // Promotion
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('COUNTER_CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printTicketData, setPrintTicketData] = useState(null);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(() => getMaxSeatsPerBooking());

  const showtimeUuid = selectedShowtime?.uuid || '';

  const {
    seatRows,
    aisleLayout,
    selectedSeats,
    hasGapViolation,
    isMapLoading,
    fetchSeatMap,
  } = useSeatMapState(showtimeUuid, {
    enabled: Boolean(showtimeUuid),
    lockTimerEnabled: false,
  });

  // Quầy POS: giữ lock ghế khi chọn, nhưng không đếm ngược — nhả lock khi đổi suất / rời trang
  useEffect(() => {
    return () => {
      if (showtimeUuid) {
        bookingService.syncSeatLocks(showtimeUuid, []).catch(() => {});
      }
    };
  }, [showtimeUuid]);

  // Load Movies
  useEffect(() => {
    async function loadMovies() {
      try {
        const data = await counterService.getMovies();
        setMovies(data || []);
      } catch (err) {
        console.error('Failed to load movies:', err);
      }
    }
    loadMovies();
  }, []);

  // Load Combos
  useEffect(() => {
    async function loadCombos() {
      try {
        const data = await comboService.getActiveCombos();
        setCombos(data || []);
      } catch (err) {
        console.error('Failed to load combos:', err);
      }
    }
    loadCombos();
  }, []);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setMaxSeatsPerBooking(getMaxSeatsPerBooking(cfg)))
      .catch(() => {});
  }, []);

  // Load showtimes when cinema changes
  useEffect(() => {
    if (!currentCinemaUuid) return;

    let cancelled = false;
    async function loadShowtimes() {
      try {
        const data = await counterService.getShowtimes({ cinemaUuid: currentCinemaUuid });
        if (!cancelled) {
          setAllShowtimes(data || []);
          setSelectedShowtime(null);
        }
      } catch (err) {
        console.error('Failed to load showtimes:', err);
      }
    }
    loadShowtimes();
    return () => { cancelled = true; };
  }, [currentCinemaUuid]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'date') {
        next.timeSlot = '';
        next.movieUuid = '';
      } else if (key === 'timeSlot') {
        next.movieUuid = '';
      }
      return next;
    });
    setSelectedShowtime(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ date: '', timeSlot: '', movieUuid: '' });
    setSelectedShowtime(null);
  }, []);

  const hasActiveFilters = Boolean(filters.date || filters.timeSlot || filters.movieUuid);

  // Listen to counter location changes
  useEffect(() => {
    const handleLocationChange = () => {
      setLocationVersion((v) => v + 1);
      setFilters({ date: '', timeSlot: '', movieUuid: '' });
      setSelectedShowtime(null);
    };
    window.addEventListener('counter-location-changed', handleLocationChange);
    return () => window.removeEventListener('counter-location-changed', handleLocationChange);
  }, []);

  const matchingShowtimes = useMemo(
    () => applyShowtimeFilters(
      allShowtimes,
      { roomUuid: currentRoomUuid, ...filters },
      ['room', 'date', 'timeSlot', 'movieUuid'],
    ),
    [allShowtimes, currentRoomUuid, filters],
  );

  const movieOptions = useMemo(() => [
    { value: '', label: 'Tất cả phim' },
    ...movies.map((movie) => {
      const rawPoster = movie.primaryMediaUrl || movie.posterUrl || movie.poster || '';
      return {
        value: movie.uuid,
        label: movie.title,
        image: rawPoster ? resolveMediaUrl(rawPoster, 120) : '',
      };
    }),
  ], [movies]);

  const handleCoupleClick = useCallback(async (seats) => {
    if (!showtimeUuid) return;

    const pairUuids = seats.map((s) => s.seatUuid);
    const bothSelected = pairUuids.every((uuid) =>
      selectedSeats.some((s) => s.seatUuid === uuid),
    );

    if (!bothSelected) {
      const seatsAfterAdd = new Set([
        ...selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid),
        ...pairUuids,
      ]);
      if (seatsAfterAdd.size > maxSeatsPerBooking) {
        notificationService.error(`Bạn chỉ được chọn tối đa ${maxSeatsPerBooking} ghế trong một lần đặt.`);
        return;
      }
    }

    const nextSelectedUuids = bothSelected
      ? selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid)
      : [
        ...selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid),
        ...pairUuids,
      ];

    try {
      await bookingService.syncSeatLocks(showtimeUuid, nextSelectedUuids);
      await fetchSeatMap(nextSelectedUuids);
    } catch (err) {
      notificationService.error(err.message || 'Không thể giữ ghế này');
    }
  }, [showtimeUuid, selectedSeats, maxSeatsPerBooking, fetchSeatMap]);

  const handleSeatClick = useCallback(async (seat) => {
    if (!showtimeUuid) return;

    const isAlreadySelected = selectedSeats.some((s) => s.seatUuid === seat.seatUuid);
    if (!isAlreadySelected && selectedSeats.length >= maxSeatsPerBooking) {
      notificationService.error(`Bạn chỉ được chọn tối đa ${maxSeatsPerBooking} ghế trong một lần đặt.`);
      return;
    }

    const nextSelectedUuids = isAlreadySelected
      ? selectedSeats.filter((s) => s.seatUuid !== seat.seatUuid).map((s) => s.seatUuid)
      : [...selectedSeats.map((s) => s.seatUuid), seat.seatUuid];

    try {
      await bookingService.syncSeatLocks(showtimeUuid, nextSelectedUuids);
      await fetchSeatMap(nextSelectedUuids);
    } catch (err) {
      notificationService.error(err.message || 'Không thể giữ ghế này');
    }
  }, [showtimeUuid, selectedSeats, maxSeatsPerBooking, fetchSeatMap]);

  // Handle combo quantity adjustment
  const handleComboQuantity = (comboUuid, delta) => {
    setSelectedCombos(prev => {
      const current = prev[comboUuid] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[comboUuid];
        return copy;
      }
      return { ...prev, [comboUuid]: next };
    });
  };

  // Customer search by phone
  const handleCustomerSearch = async (e) => {
    const val = e.target.value;
    setCustomerSearch(val);
    if (val.trim().length >= 3) {
      try {
        const results = await counterService.searchCustomer(val);
        setSearchResults(results || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Quick register customer inline
  const handleQuickRegisterCustomer = async () => {
    if (!newCustomer.fullName || !newCustomer.email || !newCustomer.phoneNumber) {
      notificationService.error('Vui lòng điền đầy đủ họ tên, email, và số điện thoại');
      return;
    }
    try {
      const res = await counterService.createCustomer(newCustomer);
      setSelectedCustomer({
        id: res.id,
        fullName: res.fullName,
        email: res.email,
        phoneNumber: res.phoneNumber
      });
      setIsWalkIn(false);
      setShowQuickAddCustomer(false);
      setNewCustomer({ fullName: '', email: '', phoneNumber: '' });
      notificationService.success('Đăng ký khách hàng thành công');
    } catch (err) {
      notificationService.error(err.message || 'Lỗi đăng ký khách hàng');
    }
  };

  // Walk-in Customer Setup
  const handleWalkInToggle = async (e) => {
    const checked = e.target.checked;
    setIsWalkIn(checked);
    if (checked) {
      setCustomerSearch('');
      setSearchResults([]);
      setShowQuickAddCustomer(false);
      try {
        const guest = await counterService.getWalkInCustomer();
        setSelectedCustomer({
          id: guest.id,
          fullName: 'Khách vãng lai',
          email: guest.email,
          phoneNumber: guest.phoneNumber,
        });
      } catch (err) {
        setSelectedCustomer(null);
        setIsWalkIn(false);
        notificationService.error(err.message || 'Không thể kích hoạt khách vãng lai');
      }
    } else {
      setSelectedCustomer(null);
    }
  };

  // Order Pricing Math
  const ticketsTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const combosTotal = useMemo(() => {
    return Object.entries(selectedCombos).reduce((sum, [uuid, qty]) => {
      const combo = combos.find(c => c.uuid === uuid);
      return sum + (combo ? combo.price * qty : 0);
    }, 0);
  }, [selectedCombos, combos]);

  const subTotal = ticketsTotal + combosTotal;
  const discount = 0; // Simple calculation fallback
  const finalTotal = Math.max(0, subTotal - discount);

  // Booking confirm submit
  const handleConfirmPOSBooking = async () => {
    if (!canCreateBooking) {
      notificationService.error('Bạn không có quyền bán vé tại quầy');
      return;
    }
    if (!selectedShowtime) {
      notificationService.error('Vui lòng chọn suất chiếu');
      return;
    }
    if (selectedSeats.length === 0) {
      notificationService.error('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    if (!selectedCustomer) {
      notificationService.error('Vui lòng chọn khách hàng hoặc bật Khách vãng lai');
      return;
    }

    if (hasGapViolation) {
      notificationService.error('Lỗi khoảng trống ghế — vui lòng chọn lại');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerUuid: selectedCustomer.id,
        showtimeUuid: selectedShowtime.uuid,
        seatUuids: selectedSeats.map(s => s.seatUuid),
        combos: Object.entries(selectedCombos).map(([uuid, qty]) => ({
          comboUuid: uuid,
          quantity: qty
        })),
        promotionCode: promoCode || null,
        paymentMethod: paymentMethod
      };

      const res = await counterService.confirmCounterBooking(payload);

      // Trigger success dialog & thermal ticket mockup
      setPrintTicketData({
        movieTitle: selectedShowtime.movieTitle,
        roomName: selectedShowtime.cinemaRoomName,
        startTime: selectedShowtime.startTime,
        customerName: selectedCustomer.fullName,
        customerEmail: selectedCustomer.email,
        seats: selectedSeats.map((s) => s.id || s.name || '').join(', '),
        combos: Object.entries(selectedCombos).map(([uuid, qty]) => {
          const combo = combos.find(c => c.uuid === uuid);
          return `${qty}x ${combo?.name || ''}`;
        }).join(', '),
        totalPrice: finalTotal,
        paymentMethod: paymentMethod,
        tickets: res.tickets || []
      });

      // Clear selections but keep showtime if they need to check in more
      setSelectedCombos({});
      setPromoCode('');

      await fetchSeatMap([]);
      notificationService.success('Đã xuất vé và thanh toán thành công!');
    } catch (err) {
      notificationService.error(err.message || 'Lỗi xác nhận thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeatLabel = (seat) => seat.id || seat.name || '';

  return (
    <div className="adm-page staff-control counter-pos">
      <CounterPageHeader
        eyebrow="Trung tâm vận hành rạp"
        title="Quầy bán vé POS"
        description="Chọn suất chiếu, ghế ngồi và thanh toán tại quầy."
      />

      <section className="staff-control__panel staff-control__panel--showtimes-picker">
        <div className="staff-control__panel-head">
          <h2 className="staff-control__panel-title">Chọn suất chiếu</h2>
          {hasActiveFilters && (
            <button type="button" className="staff-control__filter-clear" onClick={handleClearFilters}>
              <X className="w-3 h-3" />
              Xóa lọc
            </button>
          )}
        </div>

        <CounterPosShowtimeFilters
          showtimes={allShowtimes}
          filters={filters}
          roomUuid={currentRoomUuid}
          onFilterChange={handleFilterChange}
          movieOptions={movieOptions}
        />

        <div className="staff-control__field staff-control__field--wide">
          <label className="staff-control__field-label">Xác nhận suất chiếu</label>
          <div className="staff-control__showtime-pills">
            {!filters.date ? (
              <span className="staff-control__empty-inline">Chọn ngày chiếu để xem suất</span>
            ) : matchingShowtimes.length === 0 ? (
              <span className="staff-control__empty-inline">Không có suất phù hợp với bộ lọc</span>
            ) : (
              matchingShowtimes.map((st, index) => (
                <button
                  key={st.uuid}
                  type="button"
                  style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                  onClick={() => setSelectedShowtime(st)}
                  className={`staff-control__pill counter-pos__pill ${selectedShowtime?.uuid === st.uuid ? 'staff-control__pill--active counter-pos__pill--active' : ''}`}
                >
                  {new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  <span className="staff-control__pill-room">{st.movieTitle}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="staff-control__grid">
        <section className="staff-control__panel staff-control__panel--map min-h-[460px]">
          <h2 className="staff-control__panel-title">Sơ đồ ghế trực tiếp</h2>

          {selectedShowtime ? (
            <div className="w-full">
              {isMapLoading && seatRows.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang tải sơ đồ ghế...
                </div>
              ) : (
                <div className="counter-pos-seatmap staff-control__seat-map-wrap">
                  <TheaterSeatMapPanel
                    seatRows={seatRows}
                    aisleLayout={aisleLayout}
                    hasGapViolation={hasGapViolation}
                    onSeatClick={handleSeatClick}
                    onCoupleClick={handleCoupleClick}
                    screenAccent="white"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="staff-control__empty">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Chưa chọn suất chiếu</p>
              <p className="text-[0.7rem] mt-1">Chọn rạp, ngày, suất và phim ở bảng trên để kích hoạt sơ đồ ghế</p>
            </div>
          )}
        </section>

        <div className="staff-control__sidebar">

          <aside className="staff-control__panel">
            <h2 className="staff-control__panel-title">
              <Popcorn className="w-3.5 h-3.5" />
              Bắp nước & Phụ kiện
            </h2>
            <div className="staff-control__combo-list max-h-[220px] overflow-y-auto">
              {combos.map((combo) => {
                const comboImage = combo.imageUrl?.trim()
                  ? resolveMediaUrl(combo.imageUrl.trim(), 120)
                  : '';
                return (
                  <div key={combo.uuid} className="staff-control__combo-item staff-control__combo-item--interactive counter-pos__combo-item">
                    <div className="counter-pos__combo-main">
                      {comboImage ? (
                        <img
                          src={comboImage}
                          alt={combo.name}
                          className="counter-pos__combo-poster"
                          loading="lazy"
                          decoding="async"
                          onError={handlePosterError}
                        />
                      ) : (
                        <div className="counter-pos__combo-poster counter-pos__combo-poster--placeholder" aria-hidden>
                          <Popcorn className="w-4 h-4" />
                        </div>
                      )}
                      <div className="counter-pos__combo-info">
                        <span className="text-white font-semibold">{combo.name}</span>
                        <p className="text-[0.65rem] text-red-400 font-bold mt-0.5">{combo.price.toLocaleString('vi-VN')}đ</p>
                      </div>
                    </div>
                    <div className="staff-control__qty-controls">
                      <button type="button" onClick={() => handleComboQuantity(combo.uuid, -1)} disabled={!canAddCombos || !(selectedCombos[combo.uuid] > 0)}>−</button>
                      <span>{selectedCombos[combo.uuid] || 0}</span>
                      <button type="button" onClick={() => handleComboQuantity(combo.uuid, 1)} disabled={!canAddCombos}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <aside className="staff-control__panel">
            <div className="staff-control__panel-head">
              <h2 className="staff-control__panel-title">
                <User className="w-3.5 h-3.5" />
                Khách hàng
              </h2>
              <label className="staff-control__walkin-toggle" htmlFor="walkInCheck">
                <input type="checkbox" id="walkInCheck" checked={isWalkIn} onChange={handleWalkInToggle} />
                Khách vãng lai
              </label>
            </div>

            {!isWalkIn && (
              <div className="staff-control__checkin-form">
                <div className="staff-control__search-wrap">
                  <Search className="w-4 h-4" />
                  <input type="text" className="staff-control__input" value={customerSearch} onChange={handleCustomerSearch} placeholder="Tìm theo Email..." />
                </div>

                {searchResults.length > 0 && (
                  <div className="staff-control__search-results">
                    {searchResults.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setSearchResults([]);
                          setCustomerSearch(cust.email);
                        }}
                        className="staff-control__search-result"
                      >
                        <div>
                          <p className="font-semibold text-white">{cust.fullName}</p>
                          <p className="text-[0.65rem] text-slate-500">{cust.phoneNumber} · {cust.email}</p>
                        </div>
                        {selectedCustomer?.id === cust.id && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}

                {customerSearch.trim().length >= 3 && !selectedCustomer && searchResults.length === 0 && (
                  <p className="staff-control__empty-inline text-center py-2">Không tìm thấy khách hàng</p>
                )}

                {selectedCustomer && (
                  <div className="staff-control__preview-card">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-white">{selectedCustomer.fullName}</p>
                        <p className="text-[0.65rem] text-slate-400">{selectedCustomer.phoneNumber}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedCustomer(null)} className="text-slate-500 hover:text-white text-xs font-bold">Xóa</button>
                    </div>
                  </div>
                )}

                {canCreateCustomer && (
                  <button type="button" className="staff-control__link-btn" onClick={() => setShowQuickAddCustomer(!showQuickAddCustomer)}>
                    <UserPlus className="w-3.5 h-3.5" />
                    Đăng ký nhanh hội viên mới
                  </button>
                )}

                {canCreateCustomer && showQuickAddCustomer && (
                  <div className="staff-control__quick-form">
                    <input className="staff-control__input" placeholder="Họ và tên..." value={newCustomer.fullName} onChange={(e) => setNewCustomer((p) => ({ ...p, fullName: e.target.value }))} />
                    <input className="staff-control__input" placeholder="Email..." value={newCustomer.email} onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))} />
                    <input className="staff-control__input" placeholder="Số điện thoại..." value={newCustomer.phoneNumber} onChange={(e) => setNewCustomer((p) => ({ ...p, phoneNumber: e.target.value }))} />
                    <button type="button" className="staff-control__btn staff-control__btn--primary w-full" onClick={handleQuickRegisterCustomer}>Hoàn thành đăng ký</button>
                  </div>
                )}
              </div>
            )}

            {isWalkIn && selectedCustomer && (
              <div className="staff-control__preview-card staff-control__preview-card--success">
                <span>Khách vãng lai đã kích hoạt</span>
                <Check className="w-4 h-4" />
              </div>
            )}
          </aside>

          <aside className="staff-control__panel">
            <h2 className="staff-control__panel-title">
              <ShoppingCart className="w-3.5 h-3.5" />
              Chi tiết thanh toán
            </h2>

            <div className="staff-control__cart-lines">
              <div className="staff-control__cart-line"><span>Tạm tính vé ({selectedSeats.length} ghế)</span><span>{ticketsTotal.toLocaleString('vi-VN')}đ</span></div>
              <div className="staff-control__cart-line"><span>Tạm tính bắp nước</span><span>{combosTotal.toLocaleString('vi-VN')}đ</span></div>
              <div className="staff-control__cart-line"><span>Giảm giá mã</span><span className="text-red-400">-{discount.toLocaleString('vi-VN')}đ</span></div>
              <div className="staff-control__cart-total"><span>Tổng cộng</span><span>{finalTotal.toLocaleString('vi-VN')}đ</span></div>
            </div>

            {selectedSeats.length > 0 && (
              <div className="mb-3 space-y-1 max-h-24 overflow-y-auto">
                {selectedSeats.map((seat) => (
                  <div key={seat.seatUuid} className="flex justify-between text-[0.68rem] text-slate-400">
                    <span>Ghế {getSeatLabel(seat)}</span>
                    <span>{seat.price?.toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            )}

            <div className="staff-control__field">
              <label className="staff-control__field-label">Phương thức thanh toán</label>
              <div className="staff-control__payment-grid">
                {[
                  { id: 'COUNTER_CASH', label: 'Tiền mặt', icon: Banknote },
                  { id: 'COUNTER_CARD', label: 'Quẹt thẻ', icon: CreditCard },
                  { id: 'COUNTER_VIETQR', label: 'VietQR', icon: QrCode },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setPaymentMethod(id)} className={`staff-control__payment-btn counter-pos__chip ${paymentMethod === id ? 'staff-control__payment-btn--active counter-pos__chip--active' : ''}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmPOSBooking}
              disabled={!canCreateBooking || isSubmitting || selectedSeats.length === 0 || hasGapViolation}
              className="staff-control__btn staff-control__btn--primary counter-pos__cta w-full"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Đang ghi nhận giao dịch...
                </>
              ) : hasGapViolation ? (
                <>Lỗi khoảng trống ghế</>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  In vé & Xác nhận thanh toán
                </>
              )}
            </button>
          </aside>
        </div>
      </div>

      <PrintTicketModal data={printTicketData} onClose={() => setPrintTicketData(null)} />
    </div>
  );
}

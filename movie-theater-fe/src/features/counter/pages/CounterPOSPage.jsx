import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2, Calendar, Clock, Ticket, Popcorn, User, Search, UserPlus,
  CreditCard, Banknote, QrCode, Tag, Check, ShoppingCart, Trash2, Printer, X
} from 'lucide-react';
import { counterService } from '../api/counterService';
import { comboService } from '../../../shared/services/comboService';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
import { getMoviePosterUrl } from '../../home/utils/movieUtils';
import swal from 'sweetalert2';

export default function CounterPOSPage() {
  const currentCinemaUuid = localStorage.getItem('counter_cinema_uuid');

  // Core POS selections
  const [movies, setMovies] = useState([]);
  const [selectedMovieUuid, setSelectedMovieUuid] = useState('');
  const [showtimeDates, setShowtimeDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showtimes, setShowtimes] = useState([]);
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  // Seat map & Combos
  const [seatRows, setSeatRows] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [combos, setCombos] = useState([]);
  const [selectedCombos, setSelectedCombos] = useState({}); // comboUuid -> quantity

  // Customer Management
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isWalkIn, setIsWalkIn] = useState(true);
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

  // Sync Showtimes when cinema or movie changes
  useEffect(() => {
    if (!currentCinemaUuid) return;

    async function loadShowtimes() {
      try {
        const data = await counterService.getShowtimes({ cinemaUuid: currentCinemaUuid });

        // Group showtimes by movie and extract available dates
        const filtered = data.filter(st => !selectedMovieUuid || st.movieUuid === selectedMovieUuid);

        // Extract unique show dates
        const dates = [...new Set(filtered.map(st => {
          const dateObj = new Date(st.startTime);
          return dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        }))].sort();

        setShowtimeDates(dates);
        setShowtimes(filtered);

        // Reset showtime selection when movie or date changes
        setSelectedShowtime(null);
        setSeatRows([]);
        setSelectedSeats([]);
      } catch (err) {
        console.error('Failed to load showtimes:', err);
      }
    }
    loadShowtimes();
  }, [currentCinemaUuid, selectedMovieUuid]);

  // Listen to counter location changes in layout
  useEffect(() => {
    const handleLocationChange = () => {
      setSelectedMovieUuid('');
      setSelectedShowtime(null);
      setSeatRows([]);
      setSelectedSeats([]);
    };
    window.addEventListener('counter-location-changed', handleLocationChange);
    return () => window.removeEventListener('counter-location-changed', handleLocationChange);
  }, []);

  // Load seat map when showtime selected
  const loadSeatMap = async (showtimeUuid) => {
    try {
      const data = await bookingService.getSeatMap(showtimeUuid);
      if (data && data.rows) {
        setSeatRows(data.rows);

        // Sync already booked/locked/selected seats
        const selected = [];
        data.rows.forEach(row => {
          row.seats.forEach(seat => {
            if (seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME') {
              selected.push({
                seatUuid: seat.seatUuid,
                name: `${row.rowName}${seat.seatNumber}`,
                price: seat.price
              });
            }
          });
        });
        setSelectedSeats(selected);
      }
    } catch (err) {
      console.error('Failed to load seat map:', err);
      notificationService.error('Không thể tải sơ đồ ghế');
    }
  };

  // Filter showtimes for the selected date
  const filteredShowtimesForDate = useMemo(() => {
    if (!selectedDate) return [];
    return showtimes.filter(st => {
      const stDate = new Date(st.startTime).toLocaleDateString('en-CA');
      return stDate === selectedDate;
    });
  }, [showtimes, selectedDate]);

  // Handle seat clicks (Direct sync with server locks)
  const handleSeatClick = async (seat, rowName) => {
    if (!selectedShowtime) return;

    const isBookedOrLocked = seat.availabilityStatus === 'BOOKED' || seat.availabilityStatus === 'LOCKED_BY_OTHER' || seat.availabilityStatus === 'UNAVAILABLE';
    if (isBookedOrLocked) return;

    const isSelected = selectedSeats.some(s => s.seatUuid === seat.seatUuid);
    const nextSelectedUuids = isSelected
      ? selectedSeats.filter(s => s.seatUuid !== seat.seatUuid).map(s => s.seatUuid)
      : [...selectedSeats.map(s => s.seatUuid), seat.seatUuid];

    try {
      await bookingService.syncSeatLocks(selectedShowtime.uuid, nextSelectedUuids);

      // Update local selection state
      if (isSelected) {
        setSelectedSeats(prev => prev.filter(s => s.seatUuid !== seat.seatUuid));
      } else {
        setSelectedSeats(prev => [...prev, {
          seatUuid: seat.seatUuid,
          name: `${rowName}${seat.seatNumber}`,
          price: seat.price
        }]);
      }

      // Reload seat map from server to ensure fresh state
      loadSeatMap(selectedShowtime.uuid);
    } catch (err) {
      notificationService.error(err.message || 'Không thể giữ ghế này');
    }
  };

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
      setSelectedCustomer(null);
      // Fetch or seed guest account details behind the scenes
      try {
        const res = await counterService.createCustomer({
          fullName: 'Khách vãng lai',
          email: 'counter_guest@nasafilm.com',
          phoneNumber: '0300000000'
        });
        setSelectedCustomer({
          id: res.id,
          fullName: res.fullName,
          email: res.email,
          phoneNumber: res.phoneNumber
        });
      } catch (err) {
        console.error('Failed to get seeded guest details:', err);
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
    if (!selectedShowtime) {
      notificationService.error('Vui lòng chọn suất chiếu');
      return;
    }
    if (selectedSeats.length === 0) {
      notificationService.error('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    if (!selectedCustomer) {
      notificationService.error('Vui lòng chọn khách hàng hoặc gán Khách vãng lai');
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
        seats: selectedSeats.map(s => s.name).join(', '),
        combos: Object.entries(selectedCombos).map(([uuid, qty]) => {
          const combo = combos.find(c => c.uuid === uuid);
          return `${qty}x ${combo?.name || ''}`;
        }).join(', '),
        totalPrice: finalTotal,
        paymentMethod: paymentMethod,
        tickets: res.tickets || []
      });

      // Clear selections but keep showtime if they need to check in more
      setSelectedSeats([]);
      setSelectedCombos({});
      setPromoCode('');

      // Reload seat map to show updated booking seats
      loadSeatMap(selectedShowtime.uuid);
      notificationService.success('Đã xuất vé và thanh toán thành công!');
    } catch (err) {
      notificationService.error(err.message || 'Lỗi xác nhận thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">

      {/* Upper selections (Movie & Showtime Selection Panel) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0B0F19] border border-[#1E293B] p-6 rounded-2xl shadow-lg">

        {/* Movie Dropdown Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Chọn Phim</label>
          <div className="relative">
            <select
              value={selectedMovieUuid}
              onChange={(e) => {
                setSelectedMovieUuid(e.target.value);
                setSelectedDate('');
              }}
              className="w-full bg-[#121826] border border-[#1E293B] focus:border-indigo-500 rounded-xl py-3 px-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">-- Tất cả phim đang chiếu --</option>
              {movies.map(movie => (
                <option key={movie.uuid} value={movie.uuid} className="bg-[#0B0F19]">
                  {movie.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Dropdown Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Ngày chiếu</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={!selectedMovieUuid && showtimeDates.length === 0}
            className="w-full bg-[#121826] border border-[#1E293B] focus:border-indigo-500 rounded-xl py-3 px-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
          >
            <option value="">-- Chọn ngày chiếu --</option>
            {showtimeDates.map(d => (
              <option key={d} value={d} className="bg-[#0B0F19]">
                {new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        {/* Showtimes Pill Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Suất chiếu</label>
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto no-scrollbar">
            {filteredShowtimesForDate.length === 0 ? (
              <div className="text-gray-500 text-xs py-2 italic">Chọn phim và ngày chiếu</div>
            ) : (
              filteredShowtimesForDate.map(st => (
                <button
                  key={st.uuid}
                  onClick={() => {
                    setSelectedShowtime(st);
                    loadSeatMap(st.uuid);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedShowtime?.uuid === st.uuid
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-[#121826] border border-[#1E293B] text-gray-300 hover:bg-[#1e293b]/40 hover:text-white'
                  }`}
                >
                  {new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({st.cinemaRoomName})
                </button>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Split grid for seat map & cart detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Seat Map Grid */}
        <div className="lg:col-span-8 bg-[#0B0F19] border border-[#1E293B] p-6 rounded-2xl shadow-xl flex flex-col items-center min-h-[460px]">
          {selectedShowtime ? (
            <div className="w-full space-y-8 flex flex-col items-center">

              {/* Screen curve indicator */}
              <div className="w-full text-center">
                <div className="mx-auto w-3/4 h-1.5 bg-gradient-to-b from-indigo-500/40 to-transparent rounded-[50%] blur-xs shadow-[0_-2px_10px_rgba(99,102,241,0.2)]"></div>
                <p className="text-[10px] font-black text-gray-500 mt-3 tracking-widest uppercase">MÀN HÌNH CHÍNH</p>
              </div>

              {/* Interactive Seat grid */}
              <div className="flex flex-col gap-2 overflow-x-auto w-full max-w-full pb-4 scrollbar-hide select-none items-center">
                {seatRows.map(row => (
                  <div key={row.rowName} className="flex items-center gap-2 mb-0.5 justify-center min-w-max">
                    {/* Row Label */}
                    <span className="w-5 text-center text-[10px] font-black text-gray-500">{row.rowName}</span>

                    {row.seats.map(seat => {
                      const isOccupied = seat.availabilityStatus === 'BOOKED' || seat.availabilityStatus === 'LOCKED_BY_OTHER' || seat.availabilityStatus === 'UNAVAILABLE';
                      const isSelected = selectedSeats.some(s => s.seatUuid === seat.seatUuid);
                      const isVip = seat.seatTypeName === 'VIP';
                      const isCouple = seat.seatTypeName === 'COUPLE';

                      let btnStyle = "w-7 h-7 rounded text-[10px] font-black flex items-center justify-center transition-all cursor-pointer ";
                      if (isOccupied) {
                        btnStyle += "bg-[#1e293b]/30 text-gray-600 border border-[#1E293B]/40 cursor-not-allowed";
                      } else if (isSelected) {
                        btnStyle += "bg-indigo-600 text-white shadow shadow-indigo-500/30 font-bold border border-indigo-400/20";
                      } else if (isCouple) {
                        btnStyle += "bg-pink-900/30 text-pink-400 border border-pink-500/20 hover:bg-pink-900/50";
                      } else if (isVip) {
                        btnStyle += "bg-amber-950/30 text-amber-400 border border-amber-500/20 hover:bg-amber-950/50";
                      } else {
                        btnStyle += "bg-[#121826] text-gray-400 border border-[#1E293B] hover:bg-white/5 hover:text-white";
                      }

                      return (
                        <button
                          key={seat.seatUuid}
                          onClick={() => handleSeatClick(seat, row.rowName)}
                          disabled={isOccupied}
                          className={btnStyle}
                          title={`${seat.seatTypeName} - Ghế ${row.rowName}${seat.seatNumber}`}
                        >
                          {isOccupied ? 'X' : seat.seatNumber}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legends */}
              <div className="flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold justify-center border-t border-[#1E293B]/60 pt-4 w-full">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-[#121826] border border-[#1E293B] rounded" />
                  <span>Standard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-amber-950/30 border border-amber-500/20 rounded" />
                  <span>VIP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-pink-900/30 border border-pink-500/20 rounded" />
                  <span>Couple / Sofa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-indigo-600 rounded" />
                  <span>Đang chọn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-[#1e293b]/30 border border-[#1E293B]/40 rounded flex items-center justify-center text-[8px] text-gray-600 font-bold">X</div>
                  <span>Đã bán</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center flex-grow">
              <Ticket className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 text-xs font-bold">Chưa chọn suất chiếu</p>
              <p className="text-gray-500 text-[10px] mt-1 max-w-[240px]">
                Chọn bộ phim và chọn suất chiếu ở bảng trên để kích hoạt sơ đồ phòng ghế
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Food Combos, Customer Search, Order Summary */}
        <div className="lg:col-span-4 space-y-6">

          {/* F&B Concessions selector */}
          <div className="bg-[#0B0F19] border border-[#1E293B] p-5 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Popcorn className="w-4 h-4 text-indigo-400" />
              Bắp nước & Phụ kiện
            </h2>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {combos.map(combo => (
                <div key={combo.uuid} className="flex items-center justify-between p-2.5 bg-[#121826]/40 border border-[#1E293B] rounded-xl text-xs">
                  <div>
                    <p className="font-bold text-white">{combo.name}</p>
                    <p className="text-indigo-400 font-bold mt-0.5">{combo.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleComboQuantity(combo.uuid, -1)}
                      disabled={!(selectedCombos[combo.uuid] > 0)}
                      className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#1e293b] flex items-center justify-center font-bold text-gray-350 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-gray-200">
                      {selectedCombos[combo.uuid] || 0}
                    </span>
                    <button
                      onClick={() => handleComboQuantity(combo.uuid, 1)}
                      className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#1e293b] flex items-center justify-center font-bold text-gray-350 hover:bg-white/5 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Search & Quick Add Panel */}
          <div className="bg-[#0B0F19] border border-[#1E293B] p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Khách hàng
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="walkInCheck"
                  checked={isWalkIn}
                  onChange={handleWalkInToggle}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer border-[#1E293B] bg-[#121826]"
                />
                <label htmlFor="walkInCheck" className="text-[10px] font-black uppercase text-gray-400 cursor-pointer">Khách vãng lai</label>
              </div>
            </div>

            {!isWalkIn && (
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={handleCustomerSearch}
                    placeholder="Tìm theo Email..."
                    className="w-full bg-[#121826] border border-[#1E293B] focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-gray-150 focus:outline-none"
                  />
                </div>

                {searchResults.length > 0 ? (
                  <div className="border border-[#1E293B] rounded-xl max-h-[140px] overflow-y-auto divide-y divide-[#1e293b] bg-[#121826] no-scrollbar">
                    {searchResults.map(cust => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setSearchResults([]);
                          setCustomerSearch(cust.email);
                        }}
                        className="p-2.5 hover:bg-white/5 cursor-pointer text-xs flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-white">{cust.fullName}</p>
                          <p className="text-[10px] text-gray-500">{cust.phoneNumber} - {cust.email}</p>
                        </div>
                        {selectedCustomer?.id === cust.id && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  customerSearch.trim().length >= 3 && !selectedCustomer && (
                    <div className="text-center p-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider border border-[#1E293B] rounded-xl bg-[#121826]">
                      Không tìm thấy khách hàng
                    </div>
                  )
                )}

                {selectedCustomer && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{selectedCustomer.fullName}</p>
                      <p className="text-[10px] text-indigo-400/80 mt-0.5">{selectedCustomer.phoneNumber}</p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-gray-500 hover:text-gray-300 font-bold"
                    >
                      Xóa
                    </button>
                  </div>
                )}

                {/* Quick Register Switch */}
                <button
                  onClick={() => setShowQuickAddCustomer(!showQuickAddCustomer)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 border-none bg-transparent cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đăng ký nhanh hội viên mới
                </button>

                {showQuickAddCustomer && (
                  <div className="space-y-2 bg-[#121826] p-3 rounded-xl border border-[#1E293B]">
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={newCustomer.fullName}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg p-2 text-xs text-white"
                    />
                    <input
                      type="email"
                      placeholder="Email..."
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg p-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Số điện thoại..."
                      value={newCustomer.phoneNumber}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg p-2 text-xs text-white"
                    />
                    <button
                      onClick={handleQuickRegisterCustomer}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-[10px] transition-colors"
                    >
                      Hoàn thành đăng ký
                    </button>
                  </div>
                )}
              </div>
            )}

            {isWalkIn && selectedCustomer && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex justify-between items-center">
                <span>Khách vãng lai đã kích hoạt</span>
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Cart Pricing & Confirmation */}
          <div className="bg-[#0B0F19] border border-[#1E293B] p-5 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              Chi tiết thanh toán
            </h2>

            <div className="divide-y divide-[#1e293b] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400 font-semibold">Tạm tính vé</span>
                <span className="text-gray-200 font-bold">{ticketsTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400 font-semibold">Tạm tính bắp nước</span>
                <span className="text-gray-200 font-bold">{combosTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-400 font-semibold">Giảm giá mã</span>
                <span className="text-red-400 font-bold">-{discount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="py-3 flex justify-between items-center text-sm font-black border-t border-[#1E293B] mt-2">
                <span className="text-white">Tổng cộng</span>
                <span className="text-indigo-400 text-base font-black">{finalTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Payment methods selector */}
            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phương thức thanh toán</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('COUNTER_CASH')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-[10px] font-bold cursor-pointer ${
                    paymentMethod === 'COUNTER_CASH'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#121826] border-[#1E293B] text-gray-400 hover:text-gray-250'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Tiền mặt
                </button>
                <button
                  onClick={() => setPaymentMethod('COUNTER_CARD')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-[10px] font-bold cursor-pointer ${
                    paymentMethod === 'COUNTER_CARD'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#121826] border-[#1E293B] text-gray-400 hover:text-gray-250'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Quẹt thẻ
                </button>
                <button
                  onClick={() => setPaymentMethod('COUNTER_VIETQR')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-[10px] font-bold cursor-pointer ${
                    paymentMethod === 'COUNTER_VIETQR'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#121826] border-[#1E293B] text-gray-400 hover:text-gray-250'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  VietQR
                </button>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmPOSBooking}
              disabled={isSubmitting || selectedSeats.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-xs transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Đang ghi nhận giao dịch...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  In vé & Xác nhận thanh toán
                </>
              )}
            </button>

          </div>

        </div>

      </div>

      {/* Ticket Print Dialog simulation overlay */}
      {printTicketData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white text-gray-900 rounded-2xl shadow-2xl relative border border-gray-200 overflow-hidden font-mono flex flex-col max-h-[90vh]">

            {/* Top Close trigger */}
            <button
              onClick={() => setPrintTicketData(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-150 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Thermal ticket stub mockup layout */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-4">

              {/* Theater header stub */}
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 space-y-1">
                <h3 className="font-extrabold text-base tracking-wider">NASA FILM</h3>
                <p className="text-[10px] text-gray-500 uppercase">{printTicketData.roomName}</p>
                <p className="text-[10px] text-gray-400">{new Date(printTicketData.startTime).toLocaleString('vi-VN')}</p>
              </div>

              {/* Movie info */}
              <div className="space-y-1.5 text-xs text-left">
                <p className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Tên phim</p>
                <p className="font-extrabold text-sm text-gray-950 uppercase">{printTicketData.movieTitle}</p>
              </div>

              {/* Seat Details */}
              <div className="grid grid-cols-2 gap-4 text-xs text-left">
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Vị trí ghế</p>
                  <p className="font-extrabold text-sm text-indigo-700">{printTicketData.seats}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Phương thức</p>
                  <p className="font-semibold text-gray-800">{printTicketData.paymentMethod.replace('COUNTER_', '')}</p>
                </div>
              </div>

              {/* Customer information */}
              <div className="space-y-1 text-xs border-t border-gray-200 pt-3 text-left">
                <p className="text-gray-500 text-[9px] uppercase font-bold">Hội viên</p>
                <p className="font-bold text-gray-800">{printTicketData.customerName}</p>
                <p className="text-[10px] text-gray-400">{printTicketData.customerEmail}</p>
              </div>

              {/* Food & Beverage combos */}
              {printTicketData.combos && (
                <div className="space-y-1 text-xs border-t border-gray-200 pt-3 text-left">
                  <p className="text-gray-500 text-[9px] uppercase font-bold">Bắp nước</p>
                  <p className="font-medium text-gray-700">{printTicketData.combos}</p>
                </div>
              )}

              {/* QR Code Simulation */}
              <div className="flex flex-col items-center justify-center border-t-2 border-dashed border-gray-300 pt-5 mt-2 space-y-2">
                <div className="bg-[#f3f4f6] p-3 rounded-lg border border-gray-200">
                  {/* barcode visual */}
                  <div className="flex flex-col items-center gap-1">
                    <QrCode className="w-18 h-18 text-gray-900" />
                    <span className="text-[9px] font-bold tracking-wider text-gray-600">{printTicketData.tickets[0]?.ticketCode || 'TICKET-CODE'}</span>
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Quét mã để vào phòng chiếu</p>
              </div>

            </div>

            {/* Print action bottom bar */}
            <div className="bg-gray-50 border-t border-gray-150 p-4 flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                In vé ngay
              </button>
              <button
                onClick={() => setPrintTicketData(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useNotification } from '../../../shared/context/NotificationContext';
import { notificationService } from '../../../shared/services/notificationService';

const TicketFilters = () => {
  const [theater, setTheater] = useState('');
  const [movie, setMovie] = useState('');
  const [date, setDate] = useState('');
  const [showtime, setShowtime] = useState('');

  const { user } = useAuthContext();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleTheaterChange = (e) => {
    setTheater(e.target.value);
  };

  const handleMovieChange = (e) => {
    setMovie(e.target.value);
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  const handleShowtimeChange = (e) => {
    setShowtime(e.target.value);
  };

  const handleBookNow = () => {
    if (!user) {
      notificationService.warning("Bạn cần đăng nhập tài khoản Customer để sử dụng tính năng đặt vé.");
      navigate('/login');
      return;
    }
    if (!theater || !movie || !date || !showtime) {
      notificationService.warning("Vui lòng chọn đầy đủ Rạp, Phim, Ngày và Suất chiếu để đặt vé.");
      return;
    }
    addNotification(
      "Đặt vé thành công",
      `Đặt vé thành công tại ${theater} - Phim: ${movie} - Ngày: ${date} - Suất: ${showtime}`,
      "success"
    );
  };

  const getSelectClass = (value) => {
    const baseClass = 'h-14 w-full appearance-none rounded-xl border px-4 pr-10 text-base font-extrabold shadow-[0_10px_30px_rgba(15,23,42,0.25)] outline-none transition focus:border-red-500/40';
    if (value) {
      return `${baseClass} bg-yellow-400 border-yellow-400 text-red-700`;
    }
    return `${baseClass} bg-white border-white/10 text-neutral-800`;
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#eaf0fb] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:p-5">
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_150px] lg:items-center">
        <div className="text-3xl font-black uppercase tracking-tight text-red-600 md:text-4xl lg:text-[2.6rem] lg:leading-none">
          ĐẶT VÉ NHANH
        </div>

        {/* 1. Chọn Rạp */}
        <div className="relative">
          <select 
            className={getSelectClass(theater)} 
            value={theater} 
            onChange={handleTheaterChange}
          >
            <option value="">1. Chọn Rạp</option>
            <option value="Grand Luxe Plaza">Grand Luxe Plaza</option>
            <option value="City Center">City Center</option>
            <option value="Sunset Mall">Sunset Mall</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
        </div>

        {/* 2. Chọn Phim */}
        <div className="relative">
          <select 
            className={getSelectClass(movie)} 
            value={movie} 
            onChange={handleMovieChange}
          >
            <option value="">2. Chọn Phim</option>
            <option value="Doraemon: Lâu Đài Dưới Đáy Biển">Doraemon: Lâu Đài Dưới Đáy Biển</option>
            <option value="Ngôi Đền Kỳ Quái 5">Ngôi Đền Kỳ Quái 5</option>
            <option value="Ốc Mượn Hồn">Ốc Mượn Hồn</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
        </div>

        {/* 3. Chọn Ngày */}
        <div className="relative">
          <select 
            className={getSelectClass(date)} 
            value={date} 
            onChange={handleDateChange}
          >
            <option value="">3. Chọn Ngày</option>
            <option value="Hôm nay">Hôm nay</option>
            <option value="Ngày mai">Ngày mai</option>
            <option value="Cuối tuần này">Cuối tuần này</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
        </div>

        {/* 4. Chọn Suất */}
        <div className="relative">
          <select 
            className={getSelectClass(showtime)} 
            value={showtime} 
            onChange={handleShowtimeChange}
          >
            <option value="">4. Chọn Suất</option>
            <option value="10:00">10:00</option>
            <option value="13:30">13:30</option>
            <option value="16:00">16:00</option>
            <option value="19:00">19:00</option>
            <option value="21:30">21:30</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
        </div>

        <button 
          onClick={handleBookNow}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-base font-black uppercase tracking-wide text-white shadow-[0_14px_35px_rgba(220,38,38,0.35)] transition hover:bg-red-700"
        >
          Đặt Ngay
        </button>
      </div>
    </section>
  );
};

export default TicketFilters;

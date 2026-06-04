import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TicketFilters = () => {
  const [theater, setTheater] = useState('');
  const [movie, setMovie] = useState('');
  const [date, setDate] = useState('');
  const [showtime, setShowtime] = useState('');

  const handleTheaterChange = (e) => {
    const val = e.target.value;
    setTheater(val);
    setMovie('');
    setDate('');
    setShowtime('');
  };

  const handleMovieChange = (e) => {
    const val = e.target.value;
    setMovie(val);
    setDate('');
    setShowtime('');
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    setShowtime('');
  };

  const handleShowtimeChange = (e) => {
    setShowtime(e.target.value);
  };

  const handleBookNow = () => {
    if (theater && movie && date && showtime) {
      alert(`Đặt vé thành công tại ${theater} - Phim: ${movie} - Ngày: ${date} - Suất: ${showtime}`);
    }
  };

  const getSelectClass = (value) => {
    const baseClass = 'h-14 w-full appearance-none rounded-xl border px-4 pr-10 text-base font-extrabold shadow-[0_10px_30px_rgba(15,23,42,0.25)] outline-none transition focus:border-red-500/40 disabled:opacity-100 disabled:pointer-events-none';
    if (value) {
      return `${baseClass} bg-yellow-400 border-yellow-400 text-[#46318a]`;
    }
    return `${baseClass} bg-white border-white/10 text-[#46318a]`;
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#eaf0fb] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:p-5">
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_150px] lg:items-center">
        <div className="text-3xl font-black uppercase tracking-tight text-[#43315e] md:text-4xl lg:text-[2.6rem] lg:leading-none">
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
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6f5a9e]" />
        </div>

        {/* 2. Chọn Phim */}
        <div className="relative">
          <select 
            className={getSelectClass(movie)} 
            value={movie} 
            onChange={handleMovieChange}
            disabled={!theater}
          >
            <option value="">2. Chọn Phim</option>
            <option value="Doraemon: Lâu Đài Dưới Đáy Biển">Doraemon: Lâu Đài Dưới Đáy Biển</option>
            <option value="Ngôi Đền Kỳ Quái 5">Ngôi Đền Kỳ Quái 5</option>
            <option value="Ốc Mượn Hồn">Ốc Mượn Hồn</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6f5a9e]" />
        </div>

        {/* 3. Chọn Ngày */}
        <div className="relative">
          <select 
            className={getSelectClass(date)} 
            value={date} 
            onChange={handleDateChange}
            disabled={!movie}
          >
            <option value="">3. Chọn Ngày</option>
            <option value="Hôm nay">Hôm nay</option>
            <option value="Ngày mai">Ngày mai</option>
            <option value="Cuối tuần này">Cuối tuần này</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6f5a9e]" />
        </div>

        {/* 4. Chọn Suất */}
        <div className="relative">
          <select 
            className={getSelectClass(showtime)} 
            value={showtime} 
            onChange={handleShowtimeChange}
            disabled={!date}
          >
            <option value="">4. Chọn Suất</option>
            <option value="10:00">10:00</option>
            <option value="13:30">13:30</option>
            <option value="16:00">16:00</option>
            <option value="19:00">19:00</option>
            <option value="21:30">21:30</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6f5a9e]" />
        </div>

        <button 
          onClick={handleBookNow}
          disabled={!showtime}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#6f39b2] px-5 text-base font-black uppercase tracking-wide text-white shadow-[0_14px_35px_rgba(111,57,178,0.45)] transition hover:enabled:-translate-y-0.5 hover:enabled:bg-[#7e44c8] disabled:opacity-100 disabled:pointer-events-none"
        >
          Đặt Ngay
        </button>
      </div>
    </section>
  );
};

export default TicketFilters;

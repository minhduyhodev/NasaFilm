import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useNotification } from '../../../shared/context/NotificationContext';
import { notificationService } from '../../../shared/services/notificationService';
import { movieService } from '../../../shared/services/movieService';

const TicketFilters = () => {
  const [theater, setTheater] = useState('');
  const [movie, setMovie] = useState('');
  const [movieUuid, setMovieUuid] = useState('');
  const [moviePoster, setMoviePoster] = useState('');
  const [movieFormat, setMovieFormat] = useState('');
  const [date, setDate] = useState('');
  const [showtime, setShowtime] = useState('');

  const [moviesList, setMoviesList] = useState([]);
  const [cinemasList, setCinemasList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuthContext();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [moviesData, cinemasData] = await Promise.all([
          movieService.getMovies({ status: 'NOW_SHOWING', size: 100 }),
          movieService.getCinemas()
        ]);
        setMoviesList(moviesData?.content || moviesData || []);
        setCinemasList(cinemasData?.content || cinemasData || []);
      } catch (err) {
        console.error("Failed to fetch ticket filters data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getNext7Days = () => {
    const days = [];
    const options = { weekday: 'long', day: '2-digit', month: '2-digit' };
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + i);
      
      let label = '';
      const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (i === 0) {
        label = `Hôm nay, ${dateStr}`;
      } else if (i === 1) {
        label = `Ngày mai, ${dateStr}`;
      } else {
        label = `${dateObj.toLocaleDateString('vi-VN', { weekday: 'long' })}, ${dateStr}`;
      }
      
      days.push({
        value: label,
        label: label
      });
    }
    return days;
  };

  const handleTheaterChange = (e) => {
    setTheater(e.target.value);
  };

  const handleMovieChange = (e) => {
    const selectedTitle = e.target.value;
    setMovie(selectedTitle);
    
    const selectedMovieObj = moviesList.find(m => m.title === selectedTitle);
    if (selectedMovieObj) {
      setMovieUuid(selectedMovieObj.uuid);
      setMoviePoster(selectedMovieObj.primaryMediaUrl || '');
      setMovieFormat(selectedMovieObj.ageRating || '2D');
    } else {
      setMovieUuid('');
      setMoviePoster('');
      setMovieFormat('');
    }
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
    navigate('/booking', {
      state: {
        showtimeUuid: movieUuid,
        theater: `${theater} - Phòng chiếu IMAX`,
        movie,
        moviePoster,
        movieFormat,
        date,
        showtime
      }
    });
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
            {cinemasList.map((c) => (
              <option key={c.uuid} value={c.name}>{c.name}</option>
            ))}
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
            {moviesList.map((m) => (
              <option key={m.uuid} value={m.title}>{m.title}</option>
            ))}
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
            {getNext7Days().map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
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

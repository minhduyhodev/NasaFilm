import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useNotification } from '../../../shared/context/NotificationContext';
import { notificationService } from '../../../shared/services/notificationService';
import { movieService } from '../../../shared/services/movieService';

// Styles for custom dropdown scrollbar and animations
const dropdownStyles = `
  .custom-dropdown-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-dropdown-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-dropdown-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  .custom-dropdown-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  @keyframes slideDownFade {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slide-down-fade {
    animation: slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

// Reusable Custom Dropdown Component
const Dropdown = ({ 
  placeholder, 
  value, 
  options, 
  onChange, 
  isOpen, 
  onToggle 
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isOpen) {
          onToggle(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    onToggle(false);
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const displayImage = selectedOption?.image;

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className={`h-14 w-full flex items-center justify-between rounded-xl border px-4 text-base font-extrabold shadow-[0_8px_25px_rgba(0,0,0,0.08)] outline-none transition duration-300 ${
          value 
            ? 'bg-yellow-400 border-yellow-400 text-red-700 hover:bg-yellow-500 hover:border-yellow-500' 
            : 'bg-white border-white/10 text-neutral-800 hover:border-neutral-300'
        }`}
      >
        <span className="flex items-center truncate pr-2">
          {displayImage && (
            <img 
              src={displayImage} 
              alt={displayLabel} 
              className="w-7 h-10 object-cover rounded-md mr-2.5 shadow-sm border border-black/10 flex-shrink-0" 
            />
          )}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown 
          className={`h-5 w-5 transition-transform duration-300 ${
            value ? 'text-red-700' : 'text-neutral-400'
          } ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 max-h-72 overflow-y-auto z-[9999] rounded-xl border border-neutral-100 bg-white/95 backdrop-blur-md p-1.5 shadow-[0_15px_45px_rgba(0,0,0,0.12)] animate-slide-down-fade custom-dropdown-scrollbar">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400 italic text-center">
              Không có dữ liệu
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center w-full cursor-pointer rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 break-words ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-neutral-700 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  {opt.image && (
                    <img 
                      src={opt.image} 
                      alt={opt.label} 
                      className="w-10 h-14 object-cover rounded-lg mr-3 shadow-md border border-neutral-100/50 flex-shrink-0" 
                    />
                  )}
                  <span className="flex-grow text-left leading-snug">{opt.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

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
  const [openDropdown, setOpenDropdown] = useState(null); // 'theater' | 'movie' | 'date' | 'showtime' | null

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
        const weekdayStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
        // Capitalize first letter of weekday
        const capitalizedWeekday = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
        label = `${capitalizedWeekday}, ${dateStr}`;
      }
      
      days.push({
        value: label,
        label: label
      });
    }
    return days;
  };

  const handleTheaterChange = (selectedTheater) => {
    setTheater(selectedTheater);
  };

  const handleMovieChange = (selectedTitle) => {
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

  const handleDateChange = (selectedDate) => {
    setDate(selectedDate);
  };

  const handleShowtimeChange = (selectedShowtime) => {
    setShowtime(selectedShowtime);
  };

  const handleToggleDropdown = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
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

  return (
    <section className="rounded-2xl border border-white/10 bg-[#eaf0fb] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:p-5">
      <style dangerouslySetInnerHTML={{ __html: dropdownStyles }} />
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_150px] lg:items-center">
        <div className="text-3xl font-black uppercase tracking-tight text-red-600 md:text-4xl lg:text-[2.6rem] lg:leading-none">
          ĐẶT VÉ NHANH
        </div>

        {/* 1. Chọn Rạp */}
        <Dropdown
          placeholder="1. Chọn Rạp"
          value={theater}
          options={cinemasList.map((c) => ({ value: c.name, label: c.name }))}
          onChange={handleTheaterChange}
          isOpen={openDropdown === 'theater'}
          onToggle={(isOpen) => handleToggleDropdown('theater', isOpen)}
        />

        {/* 2. Chọn Phim */}
        <Dropdown
          placeholder="2. Chọn Phim"
          value={movie}
          options={moviesList.map((m) => ({ 
            value: m.title, 
            label: m.title,
            image: m.primaryMediaUrl
          }))}
          onChange={handleMovieChange}
          isOpen={openDropdown === 'movie'}
          onToggle={(isOpen) => handleToggleDropdown('movie', isOpen)}
        />

        {/* 3. Chọn Ngày */}
        <Dropdown
          placeholder="3. Chọn Ngày"
          value={date}
          options={getNext7Days()}
          onChange={handleDateChange}
          isOpen={openDropdown === 'date'}
          onToggle={(isOpen) => handleToggleDropdown('date', isOpen)}
        />

        {/* 4. Chọn Suất */}
        <Dropdown
          placeholder="4. Chọn Suất"
          value={showtime}
          options={[
            { value: '10:00', label: '10:00' },
            { value: '13:30', label: '13:30' },
            { value: '16:00', label: '16:00' },
            { value: '19:00', label: '19:00' },
            { value: '21:30', label: '21:30' }
          ]}
          onChange={handleShowtimeChange}
          isOpen={openDropdown === 'showtime'}
          onToggle={(isOpen) => handleToggleDropdown('showtime', isOpen)}
        />

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

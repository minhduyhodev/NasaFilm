import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Search, Map as MapIcon, Calendar, Film, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { notificationService } from '../../../shared/services/notificationService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { showtimeService } from '../../../shared/services/showtimeService';

import heroBg from '../../../shared/assets/cinema_hero_bg.webp';
import landmark81Img from '../../../shared/assets/cinema_landmark81.webp';
import cityCenterImg from '../../../shared/assets/cinema_citycenter.webp';
import sunsetMallImg from '../../../shared/assets/cinema_sunsetmall.webp';
import './CinemasPage.css';

const FALLBACK_IMAGES = [landmark81Img, cityCenterImg, sunsetMallImg];
const SLOGANS = ['Premium Luxury', 'Executive Lounge', 'Futuristic Space'];

const ROOM_TYPE_LABELS = {
  IMAX: 'IMAX Laser',
  VIP: 'Gold Class',
  FOUR_DX: '4DX Immersive',
  DOLBY_ATMOS: 'Dolby Cinema',
  STANDARD: 'Standard',
};

function extractCity(address = '') {
  const normalized = address.toLowerCase();
  if (normalized.includes('hà nội') || normalized.includes('ha noi')) return 'Hà Nội';
  if (normalized.includes('đà nẵng') || normalized.includes('da nang')) return 'Đà Nẵng';
  if (
    normalized.includes('tp.hcm') ||
    normalized.includes('tp. hồ chí minh') ||
    normalized.includes('hồ chí minh') ||
    normalized.includes('ho chi minh')
  ) {
    return 'TP. Hồ Chí Minh';
  }
  return 'Khác';
}

function formatShowtimeLabel(startTime) {
  return new Date(startTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatShowtimeDate(startTime) {
  return new Date(startTime).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function groupShowtimesByMovie(showtimes) {
  const map = new Map();
  for (const st of showtimes) {
    const key = st.movieUuid || st.movieTitle;
    if (!map.has(key)) {
      map.set(key, { movieTitle: st.movieTitle, movieUuid: st.movieUuid, showtimes: [] });
    }
    map.get(key).showtimes.push(st);
  }
  return Array.from(map.values()).map((group) => ({
    ...group,
    showtimes: group.showtimes.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    ),
  }));
}

const CinemasPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Tất cả');
  const [expandedCinemaId, setExpandedCinemaId] = useState(null);
  const [cinemas, setCinemas] = useState([]);
  const [showtimesByCinema, setShowtimesByCinema] = useState(new Map());
  const [loadingShowtimesId, setLoadingShowtimesId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const cinemaData = await cinemaService.getCinemasWithRooms('', 0, 100);

        if (cancelled) return;

        const cinemaList = Array.isArray(cinemaData) ? cinemaData : cinemaData.content || [];

        const enriched = cinemaList.map((cinema, index) => {
          const rooms = cinema.rooms || [];
          const techs = [...new Set(
            rooms
              .map((room) => ROOM_TYPE_LABELS[room.roomType] || room.name)
              .filter(Boolean)
          )];
          return {
            id: cinema.uuid,
            uuid: cinema.uuid,
            name: cinema.name,
            slogan: SLOGANS[index % SLOGANS.length],
            city: extractCity(cinema.address),
            address: cinema.address,
            phone: cinema.phoneNumber || '',
            entranceNote: cinema.entranceNote || '',
            latitude: cinema.latitude,
            longitude: cinema.longitude,
            image: cinema.imageUrl || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
            techs: techs.length > 0 ? techs : [`${cinema.totalRooms || rooms.length || 0} phòng chiếu`],
            totalRooms: cinema.totalRooms ?? rooms.length,
          };
        });

        setCinemas(enriched);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load cinemas:', err);
          setError('Không thể tải danh sách rạp chiếu. Vui lòng thử lại sau.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    const unique = [...new Set(cinemas.map((c) => c.city).filter(Boolean))];
    return ['Tất cả', ...unique.sort((a, b) => a.localeCompare(b, 'vi'))];
  }, [cinemas]);

  const filteredCinemas = useMemo(() => {
    return cinemas.filter((cinema) => {
      const matchesCity = selectedCity === 'Tất cả' || cinema.city === selectedCity;
      const matchesSearch =
        cinema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cinema.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesSearch;
    });
  }, [cinemas, searchQuery, selectedCity]);

  const expandedCinema = useMemo(
    () => cinemas.find((c) => c.id === expandedCinemaId) || null,
    [cinemas, expandedCinemaId]
  );

  const expandedShowtimes = useMemo(() => {
    if (!expandedCinema) return [];
    const raw = showtimesByCinema.get(expandedCinema.id) || [];
    return groupShowtimesByMovie(raw);
  }, [expandedCinema, showtimesByCinema]);

  const toggleShowtimes = async (cinemaId) => {
    if (expandedCinemaId === cinemaId) {
      setExpandedCinemaId(null);
      return;
    }
    setExpandedCinemaId(cinemaId);
    if (!showtimesByCinema.has(cinemaId)) {
      setLoadingShowtimesId(cinemaId);
      try {
        const data = await showtimeService.getPublicShowtimes({ cinemaUuid: cinemaId });
        const list = Array.isArray(data) ? data : [];
        setShowtimesByCinema((prev) => new Map(prev).set(cinemaId, list));
      } catch (err) {
        console.error('Failed to load showtimes:', err);
        setShowtimesByCinema((prev) => new Map(prev).set(cinemaId, []));
      } finally {
        setLoadingShowtimesId(null);
      }
    }
  };

  const handleShowtimeClick = (cinema, showtime) => {
    if (!user) {
      notificationService.warning('Bạn cần đăng nhập tài khoản Customer để sử dụng tính năng đặt vé.');
      navigate('/login');
      return;
    }

    const theater = `${showtime.cinemaName} - ${showtime.cinemaRoomName}`;
    const showtimeText = formatShowtimeLabel(showtime.startTime);
    const date = formatShowtimeDate(showtime.startTime);

    navigate('/booking', {
      state: {
        showtimeUuid: showtime.uuid,
        theater,
        movie: showtime.movieTitle,
        movieUuid: showtime.movieUuid,
        moviePoster: showtime.moviePosterUrl || '',
        date,
        showtime: showtimeText,
      },
    });
  };

  return (
    <div className="cinemas-page-wrapper">

      <section className="cinemas-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="cinemas-hero-overlay" />
        <div className="cinemas-hero-content">
          <motion.h1
            className="cinemas-hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Hệ Thống Rạp Chiếu
          </motion.h1>
          <motion.p
            className="cinemas-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Trải nghiệm không gian điện ảnh đẳng cấp quốc tế với trang thiết bị hiện đại bậc nhất.
          </motion.p>
        </div>
      </section>

      <main className="cinemas-container">
        <div className="space-y-6">
          <div className="cinemas-search-bar">
            <Search className="text-gray-500 h-5 w-5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm rạp theo tên hoặc địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cinemas-search-input"
            />
          </div>

          {cities.length > 1 && (
            <div className="cinemas-city-tabs">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setExpandedCinemaId(null);
                  }}
                  className={`cinemas-city-btn ${selectedCity === city ? 'cinemas-city-btn-active' : ''}`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 bg-[#11141e]/50 border border-white/5 rounded-3xl">
            <Loader2 className="h-10 w-10 text-red-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-400 font-semibold text-lg">Đang tải danh sách rạp...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-[#11141e]/50 border border-white/5 rounded-3xl">
            <Film className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-lg">{error}</p>
          </div>
        ) : filteredCinemas.length > 0 ? (
          <div className="space-y-8">
            <div className="cinemas-grid">
              {filteredCinemas.map((cinema) => (
                <div key={cinema.id} className="cinema-card flex flex-col">
                  <div className="cinema-card-img-wrapper">
                    <img src={cinema.image} alt={cinema.name} className="cinema-card-img" />
                    <span className="cinema-card-badge">{cinema.slogan}</span>
                  </div>

                  <div className="cinema-card-content flex-grow flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="cinema-card-title">{cinema.name}</h3>
                      <div className="cinema-card-details">
                        <div className="cinema-card-detail-item">
                          <MapPin className="cinema-card-icon h-4 w-4" />
                          <span>{cinema.address}</span>
                        </div>
                        {cinema.phone && (
                          <div className="cinema-card-detail-item">
                            <Phone className="cinema-card-icon h-4 w-4" />
                            <a href={`tel:${cinema.phone}`} className="hover:text-white transition">
                              {cinema.phone}
                            </a>
                          </div>
                        )}
                        {cinema.entranceNote && (
                          <div className="cinema-card-detail-item">
                            <MapIcon className="cinema-card-icon h-4 w-4" />
                            <span>{cinema.entranceNote}</span>
                          </div>
                        )}
                      </div>

                      <div className="cinema-card-techs">
                        {cinema.techs.map((tech) => (
                          <span key={tech} className="cinema-tech-badge">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="cinema-card-actions mt-6">
                      <button onClick={() => toggleShowtimes(cinema.id)} className="cinema-btn-primary">
                        {expandedCinemaId === cinema.id ? 'Ẩn lịch chiếu' : 'Lịch chiếu'}
                      </button>
                      <a
                        href={
                          cinema.latitude != null && cinema.longitude != null
                            ? `https://maps.google.com/?q=${cinema.latitude},${cinema.longitude}`
                            : `https://maps.google.com/?q=${encodeURIComponent(cinema.name + ' ' + cinema.address)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cinema-btn-secondary flex items-center justify-center"
                        title="Bản đồ"
                      >
                        <MapIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {expandedCinema && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="showtimes-expanded-area"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white border-b border-white/10 pb-3">
                      <Calendar className="h-5 w-5 text-red-500" />
                      <h4 className="font-black uppercase tracking-wider text-base">
                        Lịch Chiếu Tại {expandedCinema.name}
                      </h4>
                    </div>

                    {loadingShowtimesId === expandedCinema.id ? (
                      <div className="text-center py-6">
                        <Loader2 className="h-8 w-8 text-red-500 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-500 text-sm">Đang tải lịch chiếu...</p>
                      </div>
                    ) : expandedShowtimes.length > 0 ? (
                      <div className="space-y-1">
                        {expandedShowtimes.map((group) => (
                          <div key={group.movieUuid || group.movieTitle} className="showtimes-movie-row">
                            <div>
                              <span className="showtimes-movie-info">{group.movieTitle}</span>
                            </div>

                            <div className="showtimes-list">
                              {group.showtimes.map((st) => (
                                <button
                                  key={st.uuid}
                                  onClick={() => handleShowtimeClick(expandedCinema, st)}
                                  className="showtime-bubble"
                                  title={formatShowtimeDate(st.startTime)}
                                >
                                  {formatShowtimeLabel(st.startTime)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm py-4">
                        Chưa có suất chiếu sắp tới tại rạp này.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#11141e]/50 border border-white/5 rounded-3xl">
            <Film className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-lg">Không tìm thấy rạp chiếu nào</p>
            <p className="text-gray-500 text-sm">
              Vui lòng thử điều chỉnh lại từ khóa hoặc thành phố tìm kiếm.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CinemasPage;

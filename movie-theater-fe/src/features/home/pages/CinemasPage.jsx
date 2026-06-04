import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Search, Map, Calendar, Film } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Import cinema poster/lobby assets
import heroBg from '../../../shared/assets/cinema_hero_bg.png';
import landmark81Img from '../../../shared/assets/cinema_landmark81.png';
import cityCenterImg from '../../../shared/assets/cinema_citycenter.png';
import sunsetMallImg from '../../../shared/assets/cinema_sunsetmall.png';
import './CinemasPage.css';

const cinemaLocations = [
  {
    id: 'landmark-81',
    name: 'CINE LUXE Landmark 81',
    slogan: 'Premium Luxury',
    city: 'TP. Hồ Chí Minh',
    address: 'Tầng 5-6, Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh, TP. HCM',
    phone: '028 7300 8181',
    image: landmark81Img,
    techs: ['IMAX Laser', 'Dolby Cinema', 'Gold Class'],
    showtimes: [
      { movie: 'STELAR HORIZON', genre: 'Sci-Fi', times: ['10:00', '13:30', '16:15', '19:00', '21:45'] },
      { movie: 'VELVET LEGACY', genre: 'Drama', times: ['12:15', '15:00', '18:30', '21:15'] },
      { movie: 'WHISPERS OF OAK', genre: 'Horror', times: ['14:30', '17:45', '20:30', '23:00'] }
    ]
  },
  {
    id: 'city-center',
    name: 'CINE LUXE City Center',
    slogan: 'Executive Lounge',
    city: 'Hà Nội',
    address: 'Tầng 4, Vincom Center Bà Triệu, Hai Bà Trưng, Hà Nội',
    phone: '024 7300 1212',
    image: cityCenterImg,
    techs: ['Dolby Cinema', '4DX Immersive', 'Premium Lounge'],
    showtimes: [
      { movie: 'MIDNIGHT ECHO', genre: 'Thriller', times: ['11:15', '14:00', '17:30', '20:00', '22:30'] },
      { movie: 'KINETIC PULSE', genre: 'Action', times: ['13:00', '15:45', '18:30', '21:15'] },
      { movie: 'AETHERIA', genre: 'Fantasy', times: ['10:30', '13:15', '16:00', '18:45', '21:30'] }
    ]
  },
  {
    id: 'sunset-mall',
    name: 'CINE LUXE Sunset Mall',
    slogan: 'Futuristic Space',
    city: 'Đà Nẵng',
    address: 'Tầng 3, Sunset Mall, Ngô Quyền, Sơn Trà, Đà Nẵng',
    phone: '0236 7300 9999',
    image: sunsetMallImg,
    techs: ['IMAX Laser', '4DX Immersive', 'Gold Class'],
    showtimes: [
      { movie: 'STELAR HORIZON', genre: 'Sci-Fi', times: ['11:00', '14:30', '18:00', '21:30'] },
      { movie: 'KINETIC PULSE', genre: 'Action', times: ['12:00', '14:45', '17:30', '20:15'] },
      { movie: 'VELVET LEGACY', genre: 'Drama', times: ['13:30', '16:15', '19:00', '21:45'] }
    ]
  }
];

const CinemasPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Tất cả');
  const [expandedCinemaId, setExpandedCinemaId] = useState(null);

  const cities = ['Tất cả', 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];

  // Filter cinemas based on search input and selected city
  const filteredCinemas = useMemo(() => {
    return cinemaLocations.filter(cinema => {
      const matchesCity = selectedCity === 'Tất cả' || cinema.city === selectedCity;
      const matchesSearch = cinema.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cinema.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesSearch;
    });
  }, [searchQuery, selectedCity]);

  const toggleShowtimes = (cinemaId) => {
    setExpandedCinemaId(prev => (prev === cinemaId ? null : cinemaId));
  };

  const handleShowtimeClick = (cinemaName, movieTitle, time) => {
    alert(`Đặt vé thành công Suất chiếu: ${time} - Phim: ${movieTitle} tại ${cinemaName}`);
  };

  return (
    <div className="cinemas-page-wrapper">
      <Navbar />

      {/* Hero Header */}
      <section 
        className="cinemas-hero"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
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

      {/* Search & Filter Section */}
      <main className="cinemas-container">
        <div className="space-y-6">
          {/* Search bar */}
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

          {/* City selector tabs */}
          <div className="cinemas-city-tabs">
            {cities.map(city => (
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
        </div>

        {/* Cinemas grid */}
        {filteredCinemas.length > 0 ? (
          <div className="space-y-8">
            <div className="cinemas-grid">
              {filteredCinemas.map(cinema => (
                <div key={cinema.id} className="cinema-card flex flex-col">
                  {/* Card Image */}
                  <div className="cinema-card-img-wrapper">
                    <img src={cinema.image} alt={cinema.name} className="cinema-card-img" />
                    <span className="cinema-card-badge">{cinema.slogan}</span>
                  </div>

                  {/* Card Info */}
                  <div className="cinema-card-content flex-grow flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="cinema-card-title">{cinema.name}</h3>
                      <div className="cinema-card-details">
                        <div className="cinema-card-detail-item">
                          <MapPin className="cinema-card-icon h-4 w-4" />
                          <span>{cinema.address}</span>
                        </div>
                        <div className="cinema-card-detail-item">
                          <Phone className="cinema-card-icon h-4 w-4" />
                          <a href={`tel:${cinema.phone}`} className="hover:text-white transition">{cinema.phone}</a>
                        </div>
                      </div>
                      
                      {/* Tech badges */}
                      <div className="cinema-card-techs">
                        {cinema.techs.map(tech => (
                          <span key={tech} className="cinema-tech-badge">{tech}</span>
                        ))}
                      </div>
                    </div>

                    {/* Actions button */}
                    <div className="cinema-card-actions mt-6">
                      <button 
                        onClick={() => toggleShowtimes(cinema.id)}
                        className="cinema-btn-primary"
                      >
                        {expandedCinemaId === cinema.id ? 'Ẩn lịch chiếu' : 'Lịch chiếu'}
                      </button>
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(cinema.name + ' ' + cinema.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="cinema-btn-secondary flex items-center justify-center"
                        title="Bản đồ"
                      >
                        <Map className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Expanded Showtimes Container below the grid (linked to active cinema) */}
            <AnimatePresence>
              {expandedCinemaId && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="showtimes-expanded-area"
                >
                  {cinemaLocations.filter(c => c.id === expandedCinemaId).map(cinema => (
                    <div key={cinema.id} className="space-y-4">
                      <div className="flex items-center gap-2 text-white border-b border-white/10 pb-3">
                        <Calendar className="h-5 w-5 text-red-500" />
                        <h4 className="font-black uppercase tracking-wider text-base">Lịch Chiếu Suất Chiếu Tại {cinema.name}</h4>
                      </div>

                      <div className="space-y-1">
                        {cinema.showtimes.map(st => (
                          <div key={st.movie} className="showtimes-movie-row">
                            <div>
                              <span className="showtimes-movie-info">{st.movie}</span>
                              <span className="showtimes-movie-genre">{st.genre}</span>
                            </div>

                            <div className="showtimes-list">
                              {st.times.map(time => (
                                <button
                                  key={time}
                                  onClick={() => handleShowtimeClick(cinema.name, st.movie, time)}
                                  className="showtime-bubble"
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#11141e]/50 border border-white/5 rounded-3xl">
            <Film className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-lg">Không tìm thấy rạp chiếu nào</p>
            <p className="text-gray-500 text-sm">Vui lòng thử điều chỉnh lại từ khóa hoặc thành phố tìm kiếm.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CinemasPage;

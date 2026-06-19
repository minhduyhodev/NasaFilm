import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import { movieService } from '../../../shared/services/movieService';
import './MoviesPage.css';

const MoviesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'now-showing';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filter Options State
  const [dbGenres, setDbGenres] = useState([]);
  const [dbCountries, setDbCountries] = useState([]);
  const [dbActors, setDbActors] = useState([]);
  const [dbCinemas, setDbCinemas] = useState([]);

  // Selected Filters State (Active filters that trigger database query)
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedActor, setSelectedActor] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedShowtimeDate, setSelectedShowtimeDate] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [selectedAgeRestriction, setSelectedAgeRestriction] = useState(null);
  
  // Temporary Filters State (Local to UI before clicking "Lọc kết quả")
  const [tempCountry, setTempCountry] = useState(null);
  const [tempActor, setTempActor] = useState(null);
  const [tempGenre, setTempGenre] = useState(null);
  const [tempShowtimeDate, setTempShowtimeDate] = useState(null);
  const [tempCinema, setTempCinema] = useState(null);
  const [tempAgeRestriction, setTempAgeRestriction] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Sync tab from URL query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'now-showing' || tab === 'coming-soon')) {
      setActiveTab(tab);
    } else if (tab === 'specials') {
      setActiveTab('now-showing');
      setSearchParams({ tab: 'now-showing' }, { replace: true });
    }
  }, [searchParams]);

  // Scroll to top when activeTab or currentPage changes (pagination and tab switching)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, currentPage]);

  // Load all filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [genresData, countriesData, actorsData, cinemasData] = await Promise.all([
          movieService.getGenres(),
          movieService.getCountries(),
          movieService.getActors(),
          movieService.getCinemas()
        ]);
        setDbGenres(genresData || []);
        setDbCountries(countriesData || []);
        setDbActors(actorsData || []);
        setDbCinemas(cinemasData || []);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };
    fetchFilterOptions();
  }, []);

  const getBackendStatus = (tab) => {
    if (tab === 'coming-soon') return 'COMING_SOON';
    return 'NOW_SHOWING';
  };

  // Fetch movies when any filter or page changes
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const pageIndex = currentPage - 1;

        let data;
        if (activeTab === 'coming-soon') {
          data = await movieService.getUpcomingMovies({ page: pageIndex, size: 6 });
        } else {
          const queryParams = {
            status: getBackendStatus(activeTab),
            page: pageIndex,
            size: 6,
          };

          if (selectedGenre) {
            queryParams.genreUuids = [selectedGenre];
          }
          if (selectedCountry) {
            queryParams.countryUuid = selectedCountry;
          }
          if (selectedActor) {
            queryParams.actorUuid = selectedActor;
          }
          if (selectedCinema) {
            queryParams.cinemaUuid = selectedCinema;
          }
          if (selectedShowtimeDate) {
            queryParams.showtimeDate = selectedShowtimeDate;
          }
          if (selectedAgeRestriction) {
            queryParams.ageRestriction = selectedAgeRestriction;
          }

          data = await movieService.getMovies(queryParams);
        }

        if (data && data.content) {
          setMovies(data.content);
          setTotalPages(data.totalPages || 1);
        } else {
          setMovies([]);
          setTotalPages(1);
        }
      } catch (err) {
        console.error("Failed to fetch movies:", err);
        setMovies([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, [activeTab, currentPage, selectedGenre, selectedCountry, selectedActor, selectedCinema, selectedShowtimeDate, selectedAgeRestriction]);

  // Generate showtime dates for the next 7 days
  const filterDates = useMemo(() => {
    const dates = [];
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayLabel = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : daysOfWeek[d.getDay()];
      const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      dates.push({
        dateStr,
        label: `${dayLabel}, ${formattedDate}`
      });
    }
    return dates;
  }, []);

  const ageRestrictions = [
    { value: 'P', label: 'P (Mọi lứa tuổi)' },
    { value: 'K', label: 'K (Dưới 13 tuổi)' },
    { value: 'T13', label: 'T13 (13 tuổi trở lên)' },
    { value: 'T16', label: 'T16 (16 tuổi trở lên)' },
    { value: 'T18', label: 'T18 (18 tuổi trở lên)' }
  ];

  const handleCountrySelect = (uuid) => {
    setTempCountry(uuid);
  };

  const handleActorSelect = (uuid) => {
    setTempActor(uuid);
  };

  const handleGenreSelect = (uuid) => {
    setTempGenre(uuid);
  };

  const handleShowtimeDateSelect = (dateStr) => {
    setTempShowtimeDate(dateStr);
  };

  const handleCinemaSelect = (uuid) => {
    setTempCinema(uuid);
  };

  const handleAgeRestrictionSelect = (rating) => {
    setTempAgeRestriction(rating);
  };

  const handleApplyFilters = () => {
    setSelectedCountry(tempCountry);
    setSelectedActor(tempActor);
    setSelectedGenre(tempGenre);
    setSelectedShowtimeDate(tempShowtimeDate);
    setSelectedCinema(tempCinema);
    setSelectedAgeRestriction(tempAgeRestriction);
    setCurrentPage(1);
  };

  const handleToggleFilters = () => {
    if (!isFiltersOpen) {
      // Sync temp selections with active selections when opening
      setTempCountry(selectedCountry);
      setTempActor(selectedActor);
      setTempGenre(selectedGenre);
      setTempShowtimeDate(selectedShowtimeDate);
      setTempCinema(selectedCinema);
      setTempAgeRestriction(selectedAgeRestriction);
    }
    setIsFiltersOpen(!isFiltersOpen);
  };

  const handleCloseFilters = () => {
    setIsFiltersOpen(false);
    // Revert temp selections back to current active selections
    setTempCountry(selectedCountry);
    setTempActor(selectedActor);
    setTempGenre(selectedGenre);
    setTempShowtimeDate(selectedShowtimeDate);
    setTempCinema(selectedCinema);
    setTempAgeRestriction(selectedAgeRestriction);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    // Reset active filters
    setSelectedCountry(null);
    setSelectedActor(null);
    setSelectedGenre(null);
    setSelectedShowtimeDate(null);
    setSelectedCinema(null);
    setSelectedAgeRestriction(null);
    // Reset temp filters
    setTempCountry(null);
    setTempActor(null);
    setTempGenre(null);
    setTempShowtimeDate(null);
    setTempCinema(null);
    setTempAgeRestriction(null);
    setCurrentPage(1);
  };

  const displayedMovies = movies;

  return (
    <div className="movies-page-wrapper">
      <Navbar />

      <main className="movie-list-container">
        {/* Header section with Title & Tab buttons */}
        <div className="movie-list-header">
          <div className="movie-list-title-area">
            <h2 className="movie-list-title">{activeTab === 'coming-soon' ? 'Sắp Chiếu' : 'Đang Chiếu'}</h2>
          </div>

          {/* Tab Selection */}
          <div className="movie-list-tabs">
            {[
              { id: 'now-showing', label: 'Đang Chiếu' },
              { id: 'coming-soon', label: 'Sắp Chiếu' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`movie-list-tab-btn ${activeTab === tab.id ? 'movie-list-tab-btn-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Filters Section */}
        <div className={`horizontal-filters-panel mb-8 py-3 md:py-4 ${isFiltersOpen ? 'border border-white/10 rounded-xl px-4 md:px-5 -mx-4 md:-mx-5' : 'px-0'}`}>
          <div 
            onClick={handleToggleFilters}
            className="flex items-center gap-4 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-white font-black text-sm tracking-wider hover:text-[#FFD875] transition-colors">
              <Filter className="h-4 w-4 text-[#FFD875]" fill="#FFD875" /> Bộ lọc
            </div>
          </div>

          {isFiltersOpen && (
            <div className="space-y-4 mt-4 pt-4 border-t border-white/5">
              {/* Quốc gia */}
              <div className="filter-row">
                <span className="filter-row-label">Quốc gia:</span>
                <div className="filter-badges-container">
                  <button
                    onClick={() => handleCountrySelect(null)}
                    className={`filter-badge ${tempCountry === null ? 'filter-badge-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  {dbCountries.map(country => (
                    <button
                      key={country.uuid}
                      onClick={() => handleCountrySelect(country.uuid)}
                      className={`filter-badge ${tempCountry === country.uuid ? 'filter-badge-active' : ''}`}
                    >
                      {country.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diễn viên */}
              <div className="filter-row">
                <span className="filter-row-label">Diễn viên:</span>
                <div className="filter-badges-container">
                  <button
                    onClick={() => handleActorSelect(null)}
                    className={`filter-badge ${tempActor === null ? 'filter-badge-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  {dbActors.map(actor => (
                    <button
                      key={actor.uuid}
                      onClick={() => handleActorSelect(actor.uuid)}
                      className={`filter-badge ${tempActor === actor.uuid ? 'filter-badge-active' : ''}`}
                    >
                      {actor.fullName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thể loại */}
              <div className="filter-row">
                <span className="filter-row-label">Thể loại:</span>
                <div className="filter-badges-container">
                  <button
                    onClick={() => handleGenreSelect(null)}
                    className={`filter-badge ${tempGenre === null ? 'filter-badge-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  {dbGenres.map(genre => (
                    <button
                      key={genre.uuid}
                      onClick={() => handleGenreSelect(genre.uuid)}
                      className={`filter-badge ${tempGenre === genre.uuid ? 'filter-badge-active' : ''}`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ngày chiếu */}
              <div className="filter-row">
                <span className="filter-row-label">Suất chiếu:</span>
                <div className="filter-badges-container">
                  <button
                    onClick={() => handleShowtimeDateSelect(null)}
                    className={`filter-badge ${tempShowtimeDate === null ? 'filter-badge-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  {filterDates.map(dateObj => (
                    <button
                      key={dateObj.dateStr}
                      onClick={() => handleShowtimeDateSelect(dateObj.dateStr)}
                      className={`filter-badge ${tempShowtimeDate === dateObj.dateStr ? 'filter-badge-active' : ''}`}
                    >
                      {dateObj.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cụm rạp */}
              <div className="filter-row">
                <span className="filter-row-label">Cụm rạp:</span>
                <div className="filter-badges-container">
                  <button
                    onClick={() => handleCinemaSelect(null)}
                    className={`filter-badge ${tempCinema === null ? 'filter-badge-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  {dbCinemas.map(cinema => (
                    <button
                      key={cinema.uuid}
                      onClick={() => handleCinemaSelect(cinema.uuid)}
                      className={`filter-badge ${tempCinema === cinema.uuid ? 'filter-badge-active' : ''}`}
                    >
                      {cinema.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Xếp hạng */}
              <div className="filter-row">
                <span className="filter-row-label">Xếp hạng:</span>
                <div className="filter-badges-container">
                  <button
                    onClick={() => handleAgeRestrictionSelect(null)}
                    className={`filter-badge ${tempAgeRestriction === null ? 'filter-badge-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  {ageRestrictions.map(ratingObj => (
                    <button
                      key={ratingObj.value}
                      onClick={() => handleAgeRestrictionSelect(ratingObj.value)}
                      className={`filter-badge ${tempAgeRestriction === ratingObj.value ? 'filter-badge-active' : ''}`}
                    >
                      {ratingObj.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4 mt-2 border-t border-white/5">
                <button
                  onClick={handleApplyFilters}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-neutral-900 bg-[#FFD875] hover:bg-[#ffe194] rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0"
                >
                  Lọc kết quả <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCloseFilters}
                  className="px-6 py-2 text-sm font-bold text-gray-300 hover:text-white bg-transparent border border-white/20 hover:border-white/40 rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="movie-list-layout">
          {/* Movie Cards Grid */}
          <div className="movie-grid-area">
            {isLoading ? (
              <div className="movie-grid">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <MovieCardSkeleton key={`skeleton-${idx}`} />
                ))}
              </div>
            ) : displayedMovies.length > 0 ? (
              <div className="movie-grid">
                {displayedMovies.map(movie => (
                  <MovieCard
                    key={movie.uuid || movie.title}
                    {...movie}
                    actionLabel={activeTab === 'coming-soon' ? 'Chi tiết' : 'Mua vé'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#11141e]/50 rounded-2xl border border-white/5">
                <p className="text-gray-400 font-semibold text-base mb-2">Không tìm thấy phim nào</p>
                <p className="text-gray-500 text-xs">Vui lòng thử điều chỉnh lại từ khóa hoặc bộ lọc.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && displayedMovies.length > 0 && totalPages > 1 && (
              <div className="movie-pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="movie-pagination-nav"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNo => (
                  <button
                    key={pageNo}
                    onClick={() => setCurrentPage(pageNo)}
                    className={`movie-pagination-btn ${currentPage === pageNo ? 'movie-pagination-btn-active' : ''}`}
                  >
                    {pageNo}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="movie-pagination-nav"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MoviesPage;

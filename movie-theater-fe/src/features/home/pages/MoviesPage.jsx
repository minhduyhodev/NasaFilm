import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import { movieService } from '../../../shared/services/movieService';
import MovieFilterPanel from '../components/MovieFilterPanel';
import TabTransition from '../../../shared/components/TabTransition';
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
  const [actorQuery, setActorQuery] = useState('');
  const [isActorDropdownOpen, setIsActorDropdownOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [genreQuery, setGenreQuery] = useState('');

  const actorSearchRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [titleSearch, setTitleSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchKeyword(titleSearch.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [titleSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword]);

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
        const trimmedKeyword = searchKeyword.trim();
        const hasFilters =
          selectedGenre ||
          selectedCountry ||
          selectedActor ||
          selectedCinema ||
          selectedShowtimeDate ||
          selectedAgeRestriction;

        if (activeTab === 'coming-soon' && !trimmedKeyword && !hasFilters) {
          data = await movieService.getUpcomingMovies({ page: pageIndex, size: 6 });
        } else {
          const queryParams = {
            status: getBackendStatus(activeTab),
            page: pageIndex,
            size: 6,
          };

          if (activeTab === 'now-showing') {
            queryParams.requireBookableShowtime = true;
          }

          if (trimmedKeyword) {
            queryParams.keyword = trimmedKeyword;
          }
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
  }, [activeTab, currentPage, searchKeyword, selectedGenre, selectedCountry, selectedActor, selectedCinema, selectedShowtimeDate, selectedAgeRestriction]);

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

  const filteredActors = useMemo(() => {
    const query = actorQuery.trim().toLowerCase();
    if (!query) {
      return dbActors.slice(0, 8);
    }
    return dbActors
      .filter((actor) => actor.fullName?.toLowerCase().includes(query))
      .slice(0, 8);
  }, [actorQuery, dbActors]);

  const getActorNameByUuid = (uuid) =>
    dbActors.find((actor) => actor.uuid === uuid)?.fullName || '';

  const handleClearTempFilters = () => {
    setTempCountry(null);
    setTempActor(null);
    setActorQuery('');
    setTempGenre(null);
    setTempShowtimeDate(null);
    setTempCinema(null);
    setTempAgeRestriction(null);
    setCountryQuery('');
    setGenreQuery('');
    setIsActorDropdownOpen(false);
  };

  const handleClearAppliedFilters = () => {
    handleClearTempFilters();
    setSelectedCountry(null);
    setSelectedActor(null);
    setSelectedGenre(null);
    setSelectedShowtimeDate(null);
    setSelectedCinema(null);
    setSelectedAgeRestriction(null);
    setTitleSearch('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const activeFilters = useMemo(() => {
    const filters = [];
    if (selectedCountry) {
      const name = dbCountries.find((c) => c.uuid === selectedCountry)?.name;
      if (name) {
        filters.push({
          key: 'country',
          label: name,
          onRemove: () => {
            setSelectedCountry(null);
            setTempCountry(null);
            setCurrentPage(1);
          },
        });
      }
    }
    if (selectedGenre) {
      const name = dbGenres.find((g) => g.uuid === selectedGenre)?.name;
      if (name) {
        filters.push({
          key: 'genre',
          label: name,
          onRemove: () => {
            setSelectedGenre(null);
            setTempGenre(null);
            setCurrentPage(1);
          },
        });
      }
    }
    if (selectedActor) {
      const name = getActorNameByUuid(selectedActor);
      if (name) {
        filters.push({
          key: 'actor',
          label: name,
          onRemove: () => {
            setSelectedActor(null);
            setTempActor(null);
            setActorQuery('');
            setCurrentPage(1);
          },
        });
      }
    }
    if (selectedShowtimeDate) {
      const label = filterDates.find((d) => d.dateStr === selectedShowtimeDate)?.label;
      if (label) {
        filters.push({
          key: 'showtime',
          label: label,
          onRemove: () => {
            setSelectedShowtimeDate(null);
            setTempShowtimeDate(null);
            setCurrentPage(1);
          },
        });
      }
    }
    if (selectedCinema) {
      const name = dbCinemas.find((c) => c.uuid === selectedCinema)?.name;
      if (name) {
        filters.push({
          key: 'cinema',
          label: name,
          onRemove: () => {
            setSelectedCinema(null);
            setTempCinema(null);
            setCurrentPage(1);
          },
        });
      }
    }
    if (selectedAgeRestriction) {
      const label = ageRestrictions.find((r) => r.value === selectedAgeRestriction)?.label;
      if (label) {
        filters.push({
          key: 'rating',
          label: label,
          onRemove: () => {
            setSelectedAgeRestriction(null);
            setTempAgeRestriction(null);
            setCurrentPage(1);
          },
        });
      }
    }
    if (searchKeyword) {
      filters.push({
        key: 'search',
        label: `"${searchKeyword}"`,
        onRemove: () => {
          setTitleSearch('');
          setSearchKeyword('');
          setCurrentPage(1);
        },
      });
    }
    return filters;
  }, [
    selectedCountry,
    selectedGenre,
    selectedActor,
    selectedShowtimeDate,
    selectedCinema,
    selectedAgeRestriction,
    dbCountries,
    dbGenres,
    dbCinemas,
    filterDates,
    ageRestrictions,
    dbActors,
    searchKeyword,
  ]);

  const activeFilterCount = activeFilters.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actorSearchRef.current && !actorSearchRef.current.contains(event.target)) {
        setIsActorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (uuid) => {
    setTempCountry(uuid);
  };

  const handleActorInputChange = (value) => {
    setActorQuery(value);
    setIsActorDropdownOpen(true);
    if (!value.trim()) {
      setTempActor(null);
    }
  };

  const handleActorSelect = (actor) => {
    if (!actor) {
      setTempActor(null);
      setActorQuery('');
      setIsActorDropdownOpen(false);
      return;
    }
    setTempActor(actor.uuid);
    setActorQuery(actor.fullName);
    setIsActorDropdownOpen(false);
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
      setActorQuery(selectedActor ? getActorNameByUuid(selectedActor) : '');
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
    setActorQuery(selectedActor ? getActorNameByUuid(selectedActor) : '');
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
    setActorQuery('');
    setTempGenre(null);
    setTempShowtimeDate(null);
    setTempCinema(null);
    setTempAgeRestriction(null);
    setCountryQuery('');
    setGenreQuery('');
    setTitleSearch('');
    setSearchKeyword('');
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

        <div className="movie-title-search">
          <Search className="movie-title-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={titleSearch}
            onChange={(e) => setTitleSearch(e.target.value)}
            placeholder="Tìm kiếm tên phim..."
            className="movie-title-search-input"
            aria-label="Tìm kiếm tên phim"
          />
          {titleSearch && (
            <button
              type="button"
              onClick={() => {
                setTitleSearch('');
                setSearchKeyword('');
                setCurrentPage(1);
              }}
              className="movie-title-search-clear"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {activeTab !== 'coming-soon' && (
          <MovieFilterPanel
            isOpen={isFiltersOpen}
            onToggle={handleToggleFilters}
            onClose={handleCloseFilters}
            onApply={handleApplyFilters}
            onClearTemp={handleClearTempFilters}
            activeFilterCount={activeFilterCount}
            activeFilters={activeFilters}
            onClearApplied={handleClearAppliedFilters}
            tempCountry={tempCountry}
            tempGenre={tempGenre}
            tempShowtimeDate={tempShowtimeDate}
            tempCinema={tempCinema}
            tempAgeRestriction={tempAgeRestriction}
            onCountrySelect={handleCountrySelect}
            onGenreSelect={handleGenreSelect}
            onShowtimeDateSelect={handleShowtimeDateSelect}
            onCinemaSelect={handleCinemaSelect}
            onAgeRestrictionSelect={handleAgeRestrictionSelect}
            countryQuery={countryQuery}
            onCountryQueryChange={setCountryQuery}
            genreQuery={genreQuery}
            onGenreQueryChange={setGenreQuery}
            dbCountries={dbCountries}
            dbGenres={dbGenres}
            dbCinemas={dbCinemas}
            filterDates={filterDates}
            ageRestrictions={ageRestrictions}
            actorQuery={actorQuery}
            onActorInputChange={handleActorInputChange}
            onActorSelect={handleActorSelect}
            isActorDropdownOpen={isActorDropdownOpen}
            setIsActorDropdownOpen={setIsActorDropdownOpen}
            actorSearchRef={actorSearchRef}
            filteredActors={filteredActors}
            tempActor={tempActor}
          />
        )}

        {/* Main Grid Layout */}
        <div className="movie-list-layout">
          <TabTransition activeKey={activeTab} className="movie-grid-area">
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
          </TabTransition>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MoviesPage;

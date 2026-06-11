import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedExperiences, setSelectedExperiences] = useState([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [movies, setMovies] = useState([]);
  const [dbGenres, setDbGenres] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Sync tab from URL query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'now-showing' || tab === 'coming-soon' || tab === 'specials')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await movieService.getGenres();
        setDbGenres(data);
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    };
    fetchGenres();
  }, []);

  const getBackendStatus = (tab) => {
    if (tab === 'now-showing') return 'NOW_SHOWING';
    if (tab === 'coming-soon') return 'COMING_SOON';
    if (tab === 'specials') return 'SPECIAL';
    return 'NOW_SHOWING';
  };

  // Fetch movies when tab, page, or genre filter changes
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const beStatus = getBackendStatus(activeTab);
        const pageIndex = currentPage - 1;
        const genreUuids = selectedGenres.length > 0 ? selectedGenres : undefined;

        const data = await movieService.getMovies({
          status: beStatus,
          page: pageIndex,
          size: 6,
          genreUuids: genreUuids
        });

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
  }, [activeTab, currentPage, selectedGenres]);

  // Experience Options from mockup
  const experiences = ['IMAX Laser', '4DX Immersive', 'Dolby Cinema'];

  const handleGenreChange = (genreUuid) => {
    setSelectedGenres(prev =>
      prev.includes(genreUuid)
        ? prev.filter(uuid => uuid !== genreUuid)
        : [...prev, genreUuid]
    );
    setCurrentPage(1);
  };

  const handleExperienceChange = (exp) => {
    setSelectedExperiences(prev =>
      prev.includes(exp)
        ? prev.filter(e => e !== exp)
        : [...prev, exp]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedGenres([]);
    setSelectedExperiences([]);
    setRatingFilter(0);
    setCurrentPage(1);
  };

  const displayedMovies = useMemo(() => {
    return movies.filter(movie => {
      if (selectedExperiences.length > 0) {
        const mappedExp = movie.format === 'IMAX' ? 'IMAX Laser'
                        : movie.format === 'DOLBY' ? 'Dolby Cinema'
                        : movie.format === '4DX' ? '4DX Immersive'
                        : '';
        if (mappedExp && !selectedExperiences.includes(mappedExp)) return false;
      }

      if (ratingFilter > 0 && movie.rating < ratingFilter) {
        return false;
      }

      return true;
    });
  }, [movies, selectedExperiences, ratingFilter]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
  };

  return (
    <div className="movies-page-wrapper">
      <Navbar />

      <main className="movie-list-container">
        {/* Header section with Title & Tab buttons */}
        <div className="movie-list-header">
          <div className="movie-list-title-area">
            <h2 className="movie-list-title">{activeTab === 'now-showing' ? 'Đang Chiếu' : activeTab === 'coming-soon' ? 'Sắp Chiếu' : 'Suất Chiếu Đặc Biệt'}</h2>
            <p className="movie-list-subtitle">
              Trải nghiệm các bộ phim bom tấn mới nhất và các tác phẩm nghệ thuật đặc sắc tại hệ thống phòng chiếu cao cấp.
            </p>
          </div>

          {/* Tab Selection */}
          <div className="movie-list-tabs">
            {[
              { id: 'now-showing', label: 'Đang Chiếu' },
              { id: 'coming-soon', label: 'Sắp Chiếu' },
              { id: 'specials', label: 'Đặc Biệt' }
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

        {/* Main Grid Layout */}
        <div className="movie-list-layout">
          {/* Sidebar Filters */}
          <aside className="filter-sidebar">
            {/* Genre Filters */}
            <div className="filter-section">
              <h4 className="filter-title">Thể loại</h4>
              <div className="filter-checkbox-group">
                {dbGenres.map(genre => (
                  <label key={genre.uuid} className="filter-checkbox-row group">
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre.uuid)}
                      onChange={() => handleGenreChange(genre.uuid)}
                      className="filter-checkbox"
                    />
                    <span className="filter-checkbox-label">{genre.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Filters */}
            <div className="filter-section">
              <h4 className="filter-title">Trải nghiệm</h4>
              <div className="filter-checkbox-group">
                {experiences.map(exp => (
                  <label key={exp} className="filter-checkbox-row group">
                    <input
                      type="checkbox"
                      checked={selectedExperiences.includes(exp)}
                      onChange={() => handleExperienceChange(exp)}
                      className="filter-checkbox"
                    />
                    <span className="filter-checkbox-label">{exp}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Slider Filter */}
            <div className="filter-section">
              <h4 className="filter-title">Đánh giá</h4>
              <div className="filter-slider-group">
                <input
                  type="range"
                  min="0"
                  max="9"
                  step="1"
                  value={ratingFilter}
                  onChange={(e) => {
                    setRatingFilter(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="filter-slider"
                />
                <div className="filter-slider-labels">
                  <span>Tất cả</span>
                  <span>{ratingFilter > 0 ? `IMDb ${ratingFilter.toFixed(1)}+` : 'IMDb 8.0+'}</span>
                </div>
              </div>
            </div>

            {/* Clear Filters Button */}
            <button onClick={handleClearFilters} className="filter-clear-btn">
              Xóa bộ lọc
            </button>
          </aside>

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
                  <MovieCard key={movie.uuid || movie.title} {...movie} />
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

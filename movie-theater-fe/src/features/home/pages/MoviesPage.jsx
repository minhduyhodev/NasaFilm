import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MovieCard from '../components/MovieCard';

// Import movie poster assets
import stelarHorizonImg from '../../../shared/assets/movie_stelar_horizon.png';
import midnightEchoImg from '../../../shared/assets/movie_midnight_echo.png';
import velvetLegacyImg from '../../../shared/assets/movie_velvet_legacy.png';
import whispersOfOakImg from '../../../shared/assets/movie_whispers_of_oak.png';
import kineticPulseImg from '../../../shared/assets/movie_kinetic_pulse.png';
import aetheriaImg from '../../../shared/assets/movie_aetheria.png';
import './MoviesPage.css';

const allMovies = [
  {
    title: 'STELAR HORIZON',
    genre: 'Sci-Fi',
    rating: 8.9,
    poster: stelarHorizonImg,
    duration: '2h 45m',
    format: 'IMAX',
    category: 'now-showing'
  },
  {
    title: 'MIDNIGHT ECHO',
    genre: 'Thriller',
    rating: 7.4,
    poster: midnightEchoImg,
    duration: '1h 52m',
    format: 'DOLBY',
    category: 'now-showing'
  },
  {
    title: 'VELVET LEGACY',
    genre: 'Drama',
    rating: 9.2,
    poster: velvetLegacyImg,
    duration: '2h 15m',
    format: 'PREMIER',
    category: 'now-showing'
  },
  {
    title: 'WHISPERS OF OAK',
    genre: 'Horror',
    rating: 8.1,
    poster: whispersOfOakImg,
    duration: '1h 48m',
    format: 'IMAX',
    category: 'now-showing'
  },
  {
    title: 'KINETIC PULSE',
    genre: 'Action',
    rating: 7.8,
    poster: kineticPulseImg,
    duration: '2h 05m',
    format: '4DX',
    category: 'now-showing'
  },
  {
    title: 'AETHERIA',
    genre: 'Fantasy',
    rating: 8.5,
    poster: aetheriaImg,
    duration: '1h 58m',
    format: 'IMAX',
    category: 'now-showing'
  },
  // Extra mockup movies for different tabs
  {
    title: 'COSMIC VOYAGE',
    genre: 'Sci-Fi',
    rating: 8.7,
    poster: stelarHorizonImg,
    duration: '2h 30m',
    format: 'IMAX',
    category: 'coming-soon'
  },
  {
    title: 'STEEL CITY RUN',
    genre: 'Action',
    rating: 7.9,
    poster: kineticPulseImg,
    duration: '2h 12m',
    format: '4DX',
    category: 'coming-soon'
  },
  {
    title: 'SHADOW IN THE FOREST',
    genre: 'Horror',
    rating: 6.9,
    poster: whispersOfOakImg,
    duration: '1h 35m',
    format: 'DOLBY',
    category: 'specials'
  }
];

const MoviesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'now-showing';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedExperiences, setSelectedExperiences] = useState([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync tab from URL query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'now-showing' || tab === 'coming-soon' || tab === 'specials')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Genre Options from mockup
  const genres = ['Sci-Fi', 'Action', 'Horror', 'Drama'];
  // Experience Options from mockup
  const experiences = ['IMAX Laser', '4DX Immersive', 'Dolby Cinema'];

  const handleGenreChange = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
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

  const filteredMovies = useMemo(() => {
    return allMovies.filter(movie => {
      if (movie.category !== activeTab) return false;

      if (selectedGenres.length > 0 && !selectedGenres.includes(movie.genre)) {
        return false;
      }

      if (selectedExperiences.length > 0) {
        const mappedExp = movie.format === 'IMAX' ? 'IMAX Laser'
                        : movie.format === 'DOLBY' ? 'Dolby Cinema'
                        : movie.format === '4DX' ? '4DX Immersive'
                        : '';
        if (!selectedExperiences.includes(mappedExp)) return false;
      }

      if (ratingFilter > 0 && movie.rating < ratingFilter) {
        return false;
      }

      return true;
    });
  }, [activeTab, selectedGenres, selectedExperiences, ratingFilter]);

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
            <h2 className="movie-list-title">Now Showing</h2>
            <p className="movie-list-subtitle">
              Experience the latest blockbusters and critically acclaimed masterpieces in our premium screening rooms.
            </p>
          </div>

          {/* Tab Selection */}
          <div className="movie-list-tabs">
            {[
              { id: 'now-showing', label: 'Now Showing' },
              { id: 'coming-soon', label: 'Coming Soon' },
              { id: 'specials', label: 'Specials' }
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
              <h4 className="filter-title">Genre</h4>
              <div className="filter-checkbox-group">
                {genres.map(genre => (
                  <label key={genre} className="filter-checkbox-row group">
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre)}
                      onChange={() => handleGenreChange(genre)}
                      className="filter-checkbox"
                    />
                    <span className="filter-checkbox-label">{genre}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Filters */}
            <div className="filter-section">
              <h4 className="filter-title">Experience</h4>
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
              <h4 className="filter-title">Rating</h4>
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
                  <span>Any</span>
                  <span>{ratingFilter > 0 ? `IMDb ${ratingFilter.toFixed(1)}+` : 'IMDb 8.0+'}</span>
                </div>
              </div>
            </div>

            {/* Clear Filters Button */}
            <button onClick={handleClearFilters} className="filter-clear-btn">
              Clear Filters
            </button>
          </aside>

          {/* Movie Cards Grid */}
          <div className="movie-grid-area">
            {filteredMovies.length > 0 ? (
              <div className="movie-grid">
                {filteredMovies.map(movie => (
                  <MovieCard key={movie.title} {...movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#11141e]/50 rounded-2xl border border-white/5">
                <p className="text-gray-400 font-semibold text-base mb-2">No movies found</p>
                <p className="text-gray-500 text-xs">Try adjusting your search or filters.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredMovies.length > 0 && (
              <div className="movie-pagination">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="movie-pagination-nav"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={() => setCurrentPage(1)} 
                  className={`movie-pagination-btn ${currentPage === 1 ? 'movie-pagination-btn-active' : ''}`}
                >
                  1
                </button>
                
                <button 
                  onClick={() => setCurrentPage(2)} 
                  className={`movie-pagination-btn ${currentPage === 2 ? 'movie-pagination-btn-active' : ''}`}
                >
                  2
                </button>
                
                <button 
                  onClick={() => setCurrentPage(3)} 
                  className={`movie-pagination-btn ${currentPage === 3 ? 'movie-pagination-btn-active' : ''}`}
                >
                  3
                </button>
                
                <span className="text-gray-600 px-1 font-bold text-xs select-none">...</span>
                
                <button 
                  onClick={() => setCurrentPage(8)} 
                  className={`movie-pagination-btn ${currentPage === 8 ? 'movie-pagination-btn-active' : ''}`}
                >
                  8
                </button>
                
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(8, prev + 1))}
                  disabled={currentPage === 8}
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

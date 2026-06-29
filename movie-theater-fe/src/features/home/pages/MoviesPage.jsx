import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import MovieFilterPanel from '../components/MovieFilterPanel';
import TabTransition from '../../../shared/components/TabTransition';
import { useMoviesList, useUpcomingMoviesList } from '../../../shared/hooks/queries/useMovieQueries';
import { useMovieListFilters } from '../hooks/useMovieListFilters';
import './MoviesPage.css';

const MoviesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'now-showing';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    titleSearch,
    setTitleSearch,
    trimmedKeyword,
    hasAppliedFilters,
    appliedQueryParams,
    filterPanelProps,
    resetAllFilters,
    handleClearSearch,
  } = useMovieListFilters({
    onPageReset: () => setCurrentPage(1),
    includeShowtimeFilters: activeTab !== 'coming-soon',
  });

  const isUpcomingSimple = activeTab === 'coming-soon' && !trimmedKeyword && !hasAppliedFilters;

  const listQueryParams = useMemo(() => {
    const queryParams = {
      status: activeTab === 'coming-soon' ? 'COMING_SOON' : 'NOW_SHOWING',
      page: currentPage - 1,
      size: 6,
      ...appliedQueryParams,
    };
    if (activeTab === 'now-showing') {
      queryParams.requireBookableShowtime = true;
    }
    return queryParams;
  }, [activeTab, currentPage, appliedQueryParams]);

  const upcomingQuery = useUpcomingMoviesList(currentPage - 1, 6, isUpcomingSimple);
  const listQuery = useMoviesList(listQueryParams, !isUpcomingSimple);

  const movies = isUpcomingSimple
    ? (upcomingQuery.data?.content || [])
    : (listQuery.data?.content || []);
  const totalPages = isUpcomingSimple
    ? (upcomingQuery.data?.totalPages || 1)
    : (listQuery.data?.totalPages || 1);
  const isLoading = isUpcomingSimple ? upcomingQuery.isLoading : listQuery.isLoading;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'now-showing' || tab === 'coming-soon')) {
      setActiveTab(tab);
    } else if (tab === 'specials') {
      setActiveTab('now-showing');
      setSearchParams({ tab: 'now-showing' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, currentPage]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    resetAllFilters();
    setCurrentPage(1);
  };

  return (
    <div className="movies-page-wrapper">
      <main className="movie-list-container">
        <div className="movie-list-header">
          <div className="movie-list-title-area">
            <h2 className="movie-list-title">{activeTab === 'coming-soon' ? 'Sắp Chiếu' : 'Đang Chiếu'}</h2>
          </div>

          <div className="movie-list-tabs">
            {[
              { id: 'now-showing', label: 'Đang Chiếu' },
              { id: 'coming-soon', label: 'Sắp Chiếu' },
            ].map((tab) => (
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
              onClick={handleClearSearch}
              className="movie-title-search-clear"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <MovieFilterPanel {...filterPanelProps} />

        <div className="movie-list-layout">
          <TabTransition activeKey={activeTab} className="movie-grid-area">
            {isLoading ? (
              <div className="movie-grid">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <MovieCardSkeleton key={`skeleton-${idx}`} />
                ))}
              </div>
            ) : movies.length > 0 ? (
              <div className="movie-grid">
                {movies.map((movie) => (
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

            {!isLoading && movies.length > 0 && totalPages > 1 && (
              <div className="movie-pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="movie-pagination-nav"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
                  <button
                    key={pageNo}
                    onClick={() => setCurrentPage(pageNo)}
                    className={`movie-pagination-btn ${currentPage === pageNo ? 'movie-pagination-btn-active' : ''}`}
                  >
                    {pageNo}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
    </div>
  );
};

export default MoviesPage;

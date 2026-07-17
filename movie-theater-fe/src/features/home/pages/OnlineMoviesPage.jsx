import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import OnlineHero from '../components/online/OnlineHero';
import ContinueWatching from '../components/ContinueWatching';
import NewReleases from '../components/NewReleases';
import ExclusiveCollection from '../components/ExclusiveCollection';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import MovieFilterPanel from '../components/MovieFilterPanel';
import Pagination from '../../../shared/components/Pagination';
import VirtualGrid from '../../../shared/components/VirtualGrid';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { useOnlineSpotlightMovies, useOnlineCatalog } from '../../../shared/hooks/queries/useOnlineQueries';
import { mapApiMovies } from '../utils/movieUtils';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';
import { useMovieListFilters } from '../hooks/useMovieListFilters';
import heroBg from '../../../shared/assets/cinema_hero_bg.webp';
import '../styles/home-premium.css';
import './OnlineMoviesPage.css';
import './MoviesPage.css';

const CATALOG_PAGE_SIZE_OPTIONS = [10, 20, 30];

const OnlineMoviesPage = () => {
  const catalogRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const resetCatalogPage = useCallback(() => setCurrentPage(1), []);

  const {
    titleSearch,
    setTitleSearch,
    searchKeyword,
    appliedQueryParams,
    filterPanelProps,
    handleClearSearch,
  } = useMovieListFilters({
    onPageReset: resetCatalogPage,
    includeShowtimeFilters: false,
  });

  const spotlightQuery = useOnlineSpotlightMovies();
  const spotlightMovies = spotlightQuery.data || [];
  const isSpotlightLoading = spotlightQuery.isLoading;
  const spotlightError = spotlightQuery.isError
    ? (spotlightQuery.error?.message ||
        'Không thể tải danh sách phim trực tuyến. Vui lòng kiểm tra backend đang chạy (port 8080) rồi thử lại.')
    : '';

  const catalogParams = useMemo(
    () => ({
      ...appliedQueryParams,
      page: currentPage - 1,
      size: itemsPerPage,
    }),
    [appliedQueryParams, currentPage, itemsPerPage]
  );

  const catalogQuery = useOnlineCatalog(catalogParams);
  const catalogMovies = useMemo(
    () => mapApiMovies(catalogQuery.data?.content || []),
    [catalogQuery.data]
  );
  const totalItems = catalogQuery.data?.totalElements ?? catalogMovies.length;
  const isCatalogLoading = catalogQuery.isLoading;
  const catalogError = catalogQuery.isError
    ? (catalogQuery.error?.message || 'Không thể tải danh sách phim. Vui lòng thử lại sau.')
    : '';

  const routeMovieIds = useMemo(() => {
    const ids = new Set();
    for (const movie of [...spotlightMovies, ...catalogMovies]) {
      if (movie?.uuid) ids.add(movie.uuid);
    }
    return [...ids];
  }, [spotlightMovies, catalogMovies]);

  const { getOnlinePath, getActionLabel } = useOnlineVodRoutes(routeMovieIds);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, appliedQueryParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
    systemConfigService.getConfig().catch(() => {});
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showCatalogEmpty = !isCatalogLoading && !catalogError && catalogMovies.length === 0;
  const hasActiveFilters = Boolean(searchKeyword || filterPanelProps.activeFilterCount > 0);

  return (
    <div className="online-page-wrapper">
      <OnlineHero
        movies={spotlightMovies}
        isLoading={isSpotlightLoading}
        getOnlinePath={getOnlinePath}
        getActionLabel={getActionLabel}
        staticHeroBackground={heroBg}
      />

      <main className="online-page-container">
        {!isSpotlightLoading && <ContinueWatching onlineOnly getOnlinePath={getOnlinePath} />}
        {!isSpotlightLoading && (
          <NewReleases
            onlineOnly
            movies={spotlightMovies}
            getOnlinePath={getOnlinePath}
            getActionLabel={getActionLabel}
          />
        )}

        <section id="online-catalog" ref={catalogRef} className="online-catalog-section">
          <div className="online-catalog-header">
            <div className="online-catalog-heading">
              <p className="online-catalog-eyebrow">Thư viện VOD</p>
              <h2 className="section-heading">Tất cả phim trực tuyến</h2>
              {!isCatalogLoading && !catalogError && (
                <p className="online-catalog-meta">
                  {totalItems > 0
                    ? `${totalItems.toLocaleString('vi-VN')} phim${searchKeyword ? ` khớp “${searchKeyword}”` : ''}`
                    : 'Chưa có phim trong thư viện'}
                </p>
              )}
            </div>

            <div className="online-catalog-search">
              <Search className="online-catalog-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                placeholder="Tìm theo tên phim..."
                className="online-catalog-search-input"
                aria-label="Tìm kiếm phim trực tuyến"
              />
              {titleSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="online-catalog-search-clear"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="online-catalog-filters">
            <MovieFilterPanel {...filterPanelProps} />
          </div>

          {isCatalogLoading ? (
            <div className="online-catalog-grid">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : catalogError ? (
            <div className="online-catalog-state online-catalog-state--error">
              <p>{catalogError}</p>
              <button type="button" className="btn-gold" onClick={() => catalogQuery.refetch()}>
                Thử tải lại
              </button>
            </div>
          ) : showCatalogEmpty ? (
            <div className="online-catalog-state">
              <p className="online-catalog-state-title">
                {hasActiveFilters ? 'Không tìm thấy phim phù hợp' : 'Chưa có phim trực tuyến'}
              </p>
              <p className="online-catalog-state-desc">
                {hasActiveFilters
                  ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem toàn bộ thư viện.'
                  : 'Hệ thống sẽ cập nhật khi có phim mới.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn-gold-outline"
                  onClick={filterPanelProps.onClearApplied}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <VirtualGrid
                items={catalogMovies}
                threshold={100}
                gridClassName="online-catalog-grid"
                maxHeight="none"
                className=""
                getItemKey={(movie) => movie.uuid}
                renderItem={(movie) => (
                  <MovieCard
                    key={movie.uuid}
                    {...movie}
                    actionLabel={getActionLabel(movie.uuid, 'Xem ngay')}
                    fromOnline
                    getOnlinePath={getOnlinePath}
                  />
                )}
              />

              {totalItems > 0 && (
                <div className="online-catalog-pagination">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={setItemsPerPage}
                    itemsPerPageOptions={CATALOG_PAGE_SIZE_OPTIONS}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {!isSpotlightLoading && (
          <ExclusiveCollection
            onlineOnly
            movies={spotlightMovies}
            getOnlinePath={getOnlinePath}
          />
        )}
      </main>

      {spotlightError && spotlightMovies.length === 0 && (
        <div className="online-spotlight-error" role="alert">
          <p>{spotlightError}</p>
          <button type="button" className="btn-gold" onClick={() => spotlightQuery.refetch()}>
            Thử tải lại
          </button>
        </div>
      )}
    </div>
  );
};

export default OnlineMoviesPage;

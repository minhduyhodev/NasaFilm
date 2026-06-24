import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import OnlineHero from '../components/online/OnlineHero';
import ContinueWatching from '../components/ContinueWatching';
import NewReleases from '../components/NewReleases';
import ExclusiveCollection from '../components/ExclusiveCollection';
import OnlineVIPSection from '../components/online/OnlineVIPSection';
import Footer from '../components/Footer';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getCachedOnlineMovies, prefetchOnlineMovies } from '../utils/onlineMoviesCache';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';
import heroBg from '../../../shared/assets/cinema_hero_bg.png';
import '../styles/home-premium.css';
import './OnlineMoviesPage.css';

const OnlineMoviesPage = () => {
  const [movies, setMovies] = useState(() => getCachedOnlineMovies() ?? []);
  const [isLoading, setIsLoading] = useState(() => (getCachedOnlineMovies() ?? []).length === 0);
  const [fetchError, setFetchError] = useState('');
  const { getOnlinePath, getActionLabel } = useOnlineVodRoutes(movies.map((m) => m.uuid));

  const fetchOnline = async ({ silent = false } = {}) => {
    const hasCachedData = movies.length > 0 || Boolean(getCachedOnlineMovies()?.length);
    if (!silent && !hasCachedData) {
      setIsLoading(true);
    }
    setFetchError('');
    try {
      const onlineMovies = await prefetchOnlineMovies();
      setMovies(onlineMovies);
    } catch (err) {
      if (!hasCachedData) {
        setMovies([]);
        setFetchError(
          err?.message ||
            'Không thể tải danh sách phim trực tuyến. Vui lòng kiểm tra backend đang chạy (port 8080) rồi thử lại.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    systemConfigService.getConfig().catch(() => {});
    const cached = getCachedOnlineMovies();
    fetchOnline({ silent: Boolean(cached?.length) });
  }, []);

  return (
    <div className="online-page-wrapper">
      <Navbar />

      <OnlineHero
        movies={movies}
        isLoading={isLoading}
        getOnlinePath={getOnlinePath}
        getActionLabel={getActionLabel}
        staticHeroBackground={heroBg}
      />

      <main className="online-page-container">
        {!isLoading && <ContinueWatching onlineOnly getOnlinePath={getOnlinePath} />}
        {!isLoading && (
          <NewReleases
            onlineOnly
            movies={movies}
            getOnlinePath={getOnlinePath}
            getActionLabel={getActionLabel}
          />
        )}

        <section>
          <div className="section-heading-row">
            <h2 className="section-heading">Tất cả phim trực tuyến</h2>
          </div>
          {isLoading && movies.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-red-400 font-medium">{fetchError}</p>
              <button
                type="button"
                onClick={fetchOnline}
                className="inline-flex items-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-700 transition"
              >
                Thử tải lại
              </button>
            </div>
          ) : movies.length === 0 ? (
            <p className="text-center py-12 text-white/45">Chưa có phim trực tuyến.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.uuid}
                  {...movie}
                  actionLabel={getActionLabel(movie.uuid, 'Xem ngay')}
                  fromOnline
                  getOnlinePath={getOnlinePath}
                />
              ))}
            </div>
          )}
        </section>

        {!isLoading && <ExclusiveCollection onlineOnly movies={movies} getOnlinePath={getOnlinePath} />}
        {!isLoading && <OnlineVIPSection />}
      </main>

      <Footer />
    </div>
  );
};

export default OnlineMoviesPage;

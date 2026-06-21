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
import { movieService } from '../../../shared/services/movieService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { mapApiMovies, filterOnlineMovies } from '../utils/movieUtils';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';
import '../styles/home-premium.css';

const OnlineMoviesPage = () => {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getOnlinePath, getActionLabel } = useOnlineVodRoutes(movies.map((m) => m.uuid));

  useEffect(() => {
    systemConfigService.getConfig().catch(() => {});
    const fetchOnline = async () => {
      setIsLoading(true);
      try {
        const data = await movieService.getMovies({ status: 'NOW_SHOWING', page: 0, size: 50 });
        setMovies(filterOnlineMovies(mapApiMovies(data?.content || [])));
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOnline();
  }, []);

  return (
    <div className="text-white min-h-screen bg-black">
      <Navbar />
      <main>
        <OnlineHero
          featuredMovie={movies[0] || null}
          isLoading={isLoading}
          getOnlinePath={getOnlinePath}
          actionLabel={movies[0] ? getActionLabel(movies[0].uuid, 'Xem ngay') : 'Xem ngay'}
        />
        <section className="mt-12 px-4 md:px-8 lg:px-20">
          <div className="max-w-7xl mx-auto space-y-14 md:space-y-16">
            <ContinueWatching onlineOnly getOnlinePath={getOnlinePath} />
            <NewReleases onlineOnly getOnlinePath={getOnlinePath} getActionLabel={getActionLabel} />

            <section>
              <div className="section-heading-row">
                <h2 className="section-heading">Tất cả phim trực tuyến</h2>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <MovieCardSkeleton key={i} />
                  ))}
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

            <ExclusiveCollection onlineOnly getOnlinePath={getOnlinePath} />
            <OnlineVIPSection />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OnlineMoviesPage;

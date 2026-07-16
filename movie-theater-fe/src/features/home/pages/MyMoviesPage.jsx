import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { favoriteService } from '../../../shared/services/favoriteService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import PosterImage from '../../../shared/components/PosterImage';
import PageMeta from '../../../shared/components/PageMeta';
import { getMovieDetailPath } from '../utils/movieUtils';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrlUtils';
import { readGuestFavorites } from '../hooks/useMovieFavorite';
import './MyMoviesPage.css';

const MyMoviesPage = () => {
  const { isAuthenticated } = useAuthContext();
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (!isAuthenticated) {
          const guestIds = readGuestFavorites();
          setMovies(guestIds.map((id) => ({ movieUuid: id, title: `Phim #${id.slice(0, 8)}` })));
          return;
        }
        const data = await favoriteService.list();
        setMovies(data || []);
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  return (
    <div className="my-movies-page">
      <PageMeta title="Phim của tôi" description="Danh sách phim yêu thích trên NASAFILM" />
      <main className="my-movies-main">
        <div className="my-movies-header">
          <Heart className="w-6 h-6 text-red-500" />
          <div>
            <h1>Phim của tôi</h1>
            <p>Danh sách phim bạn đã lưu để xem sau.</p>
          </div>
        </div>

        {isLoading && <p className="my-movies-empty">Đang tải...</p>}
        {!isLoading && movies.length === 0 && (
          <p className="my-movies-empty">Chưa có phim nào được lưu. Hãy bấm &quot;Lưu phim&quot; trên trang chi tiết.</p>
        )}

        <div className="my-movies-grid">
          {movies.map((movie) => (
            <Link
              key={movie.movieUuid}
              to={getMovieDetailPath(movie.movieUuid)}
              className="my-movies-card"
            >
              <div className="my-movies-poster">
                <PosterImage
                  src={resolveMediaUrl(movie.primaryMediaUrl)}
                  alt={movie.title}
                  width={240}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="my-movies-info">
                <h3>{movie.title}</h3>
                {movie.ageRestriction && <span>{movie.ageRestriction}</span>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MyMoviesPage;

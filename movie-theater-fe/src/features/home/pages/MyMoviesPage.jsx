import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { favoriteService } from '../../../shared/services/favoriteService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import PosterImage from '../../../shared/components/PosterImage';
import PageMeta from '../../../shared/components/PageMeta';
import Pagination from '../../../shared/components/Pagination';
import { getMovieDetailPath } from '../utils/movieUtils';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrlUtils';
import { readGuestFavorites } from '../hooks/useMovieFavorite';
import './MyMoviesPage.css';

const MyMoviesPage = () => {
  const { isAuthenticated } = useAuthContext();
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

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

  const pagedMovies = movies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="my-movies-page">
      <PageMeta title="Phim của tôi" description="Danh sách phim yêu thích trên NASAFILM" />
      <main className="my-movies-main">
        <header className="my-movies-header">
          <div>
            <span className="my-movies-eyebrow">Thư viện cá nhân</span>
            <h1>Phim của tôi</h1>
            <p>Lưu lại những bộ phim đáng nhớ và quay lại khi bạn sẵn sàng xem.</p>
          </div>
          <div className="my-movies-count" aria-label={`${movies.length} phim đã lưu`}>
            <Heart aria-hidden />
            <strong>{isLoading ? '—' : movies.length}</strong>
            <span>đã lưu</span>
          </div>
        </header>

        {isLoading && (
          <div className="my-movies-grid" aria-label="Đang tải phim đã lưu">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="my-movies-skeleton" key={index} aria-hidden>
                <span />
                <i />
              </div>
            ))}
          </div>
        )}
        {!isLoading && movies.length === 0 && (
          <section className="my-movies-empty">
            <Heart aria-hidden />
            <h2>Thư viện đang trống</h2>
            <p>Chọn biểu tượng yêu thích trên poster hoặc trang chi tiết để lưu phim vào đây.</p>
            <Link to="/movies">Khám phá phim</Link>
          </section>
        )}

        {!isLoading && movies.length > 0 && (
          <>
            <div className="my-movies-grid">
              {pagedMovies.map((movie) => (
                <Link
                  key={movie.movieUuid}
                  to={getMovieDetailPath(movie.movieUuid)}
                  className="my-movies-card"
                >
                  <div className="my-movies-poster">
                    <PosterImage
                      src={resolveMediaUrl(movie.primaryMediaUrl)}
                      alt={`Poster phim ${movie.title || 'đã lưu'}`}
                      width={360}
                      className="h-full w-full object-cover"
                    />
                    <span className="my-movies-poster__mark" aria-hidden>
                      <Heart />
                    </span>
                  </div>
                  <div className="my-movies-info">
                    <h3>{movie.title}</h3>
                    {movie.ageRestriction && <span>{movie.ageRestriction}</span>}
                  </div>
                </Link>
              ))}
            </div>

            {movies.length > itemsPerPage && (
              <div className="my-movies-pagination">
                <Pagination
                  currentPage={currentPage}
                  totalItems={movies.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemsPerPageOptions={[12, 24, 48]}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyMoviesPage;

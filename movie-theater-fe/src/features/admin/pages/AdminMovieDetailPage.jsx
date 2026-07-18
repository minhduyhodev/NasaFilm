import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { User, Edit2, Trash2, Loader2, Film, ChevronRight } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { formatDateDisplay, getScreeningModeLabel, getAgeRestrictionLabel } from '../utils/adminMovieUtils.jsx';
import { getMovieStatusLabel } from '../utils/statusLabels';
import { resolveMediaUrl, unwrapMediaUrl } from '../../../shared/utils/mediaUrlUtils';
import { AdminPage, GhostButton, PrimaryButton } from '../components';
import PosterImage from '../../../shared/components/PosterImage';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './AdminMovieDetailPage.css';

/** Raw poster URL — cùng nguồn với ảnh poster sắc nét bên trái. */
function pickPosterRaw(movie) {
  const fromMedias = movie?.medias?.find((m) => m.mediaType === 'POSTER')?.mediaUrl;
  return unwrapMediaUrl(fromMedias || movie?.primaryMediaUrl || movie?.posterUrl || '');
}

const AdminMovieDetailPage = () => {
  const { movieUuid } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadMovie = async () => {
      setIsLoading(true);
      try {
        const detail = await movieService.getMovieDetail(movieUuid);
        if (isMounted) setMovie(detail);
      } catch (err) {
        console.error('Failed to load movie detail:', err);
        notificationService.error('Không thể lấy chi tiết phim');
        navigate('/admin/movies');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadMovie();
    return () => {
      isMounted = false;
    };
  }, [movieUuid, navigate]);

  const handleDelete = async () => {
    if (!movie) return;
    const ok = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa phim này không?',
      highlight: movie.title,
      detail: 'Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến phim sẽ bị xóa vĩnh viễn.',
      confirmLabel: 'Xóa phim',
      cancelLabel: 'Hủy',
      variant: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await movieService.deleteMovie(movie.uuid);
      notificationService.success(`Đã xóa phim "${movie.title}"`);
      navigate('/admin/movies');
    } catch (err) {
      console.error('Failed to delete movie:', err);
      notificationService.error(err.message || 'Xóa phim thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const posterRaw = useMemo(() => pickPosterRaw(movie), [movie]);
  const bgPosterSrc = useMemo(
    () => (posterRaw ? resolveMediaUrl(posterRaw, 800) : null),
    [posterRaw],
  );

  if (isLoading) {
    return (
      <AdminPage className="amd-page">
        <div className="adm-loading">
          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
          <p>Đang tải thông tin phim...</p>
        </div>
      </AdminPage>
    );
  }

  if (!movie) return null;

  const statusLabel = getMovieStatusLabel(movie.status);
  const onlinePrice =
    movie.onlinePrice != null
      ? `${Number(movie.onlinePrice).toLocaleString('vi-VN')} VND`
      : 'Giá mặc định hệ thống';

  return (
    <AdminPage className="amd-page" softEnter={false}>
      {bgPosterSrc ? (
        <div className="amd-bg" aria-hidden>
          <img
            className="amd-bg__img"
            src={bgPosterSrc}
            alt=""
            decoding="async"
            loading="eager"
          />
        </div>
      ) : null}
      <div className="amd-bg-scrim" aria-hidden />

      <div className="amd-shell">
        <nav className="amd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/admin/movies" className="amd-breadcrumb__link">
            Movie overview
          </Link>
          <ChevronRight className="amd-breadcrumb__sep" aria-hidden />
          <span className="amd-breadcrumb__current">{movie.title}</span>
        </nav>

        <h1 className="amd-title">{movie.title}</h1>

        <div className="amd-layout">
          <aside className="amd-aside">
            {posterRaw ? (
              <PosterImage
                src={posterRaw}
                alt={movie.title}
                width={480}
                className="amd-poster"
              />
            ) : (
              <div className="amd-poster amd-poster--empty">
                <Film className="w-12 h-12" />
              </div>
            )}
          </aside>

          <div className="amd-panels">
            <section className="amd-glass">
              <h2 className="amd-glass__title">Thông tin phim</h2>
              <dl className="amd-meta">
                <div className="amd-meta__item">
                  <dt>Trạng thái</dt>
                  <dd className="amd-meta__value amd-meta__value--status">{statusLabel}</dd>
                </div>
                <div className="amd-meta__item">
                  <dt>Ngày khởi chiếu</dt>
                  <dd className="amd-meta__value">
                    {movie.releaseDate ? formatDateDisplay(movie.releaseDate) : '—'}
                  </dd>
                </div>
                <div className="amd-meta__item">
                  <dt>Thời lượng</dt>
                  <dd className="amd-meta__value">
                    {movie.durationMinutes != null ? `${movie.durationMinutes} phút` : '—'}
                  </dd>
                </div>
                <div className="amd-meta__item">
                  <dt>Hình thức</dt>
                  <dd className="amd-meta__value">{getScreeningModeLabel(movie.screeningMode)}</dd>
                </div>
                <div className="amd-meta__item">
                  <dt>Độ tuổi</dt>
                  <dd className="amd-meta__value amd-meta__value--age">
                    {getAgeRestrictionLabel(movie.ageRestriction)}
                  </dd>
                </div>
                <div className="amd-meta__item">
                  <dt>Giá vé online</dt>
                  <dd className="amd-meta__value amd-meta__value--price">{onlinePrice}</dd>
                </div>
              </dl>
            </section>

            <section className="amd-glass">
              <h2 className="amd-glass__title">Nội dung</h2>
              <p className="amd-desc">
                {movie.description || 'Chưa có mô tả chi tiết cho phim này.'}
              </p>
            </section>

            <section className="amd-glass">
              <h2 className="amd-glass__title">Diễn viên &amp; đoàn làm phim</h2>
              <dl className="amd-classify">
                <div className="amd-classify__item">
                  <dt>Phân loại</dt>
                  <dd>
                    {movie.genres?.length ? (
                      <div className="amd-tags">
                        {movie.genres.map((g) => (
                          <span key={g} className="amd-tag">
                            {g}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="amd-classify__item">
                  <dt>Quốc gia</dt>
                  <dd className="amd-meta__value">
                    {movie.countries?.length ? movie.countries.join(', ') : '—'}
                  </dd>
                </div>
              </dl>

              <div className="amd-cast-block">
                <p className="amd-cast-block__label">Dàn diễn viên</p>
                {movie.actors?.length ? (
                  <ul className="amd-cast">
                    {movie.actors.map((actor, idx) => (
                      <li key={actor.uuid || idx} className="amd-cast__item">
                        <div className="amd-cast__avatar">
                          {actor.avatarUrl ? (
                            <img
                              src={actor.avatarUrl}
                              alt={actor.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="amd-cast__name">
                            {actor.fullName}
                            {actor.isMain ? (
                              <span className="amd-cast__main"> · Vai chính</span>
                            ) : null}
                          </p>
                          <p className="amd-cast__role">vai {actor.characterName || 'N/A'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="amd-desc amd-desc--muted">Chưa có thông tin diễn viên.</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="amd-footer">
          <PrimaryButton
            type="button"
            className="amd-btn-edit"
            onClick={() => navigate(`/admin/movies/${movie.uuid}/edit`)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Chỉnh sửa
          </PrimaryButton>
          <GhostButton
            type="button"
            className="amd-btn-delete"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Đang xóa...' : 'Xóa phim'}
          </GhostButton>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminMovieDetailPage;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Edit2, Trash2, Loader2, Film } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { formatDateDisplay, getScreeningModeLabel } from '../utils/adminMovieUtils.jsx';
import { getMovieStreamingUrl, formatAgeRestrictionBadge } from '../../home/utils/movieUtils';
import { getMovieStatusLabel } from '../utils/statusLabels';
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  GhostButton,
  PrimaryButton,
  StatusBadge,
} from '../components';
import PosterImage from '../../../shared/components/PosterImage';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './AdminMovieFormPage.css';

function movieStatusVariant(status) {
  const s = (status || '').toUpperCase();
  if (s === 'NOW_SHOWING' || s === 'SHOWING') return 'success';
  if (s === 'COMING_SOON' || s === 'UPCOMING') return 'info';
  if (s === 'ENDED' || s === 'ARCHIVED') return 'muted';
  return 'warning';
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
    return () => { isMounted = false; };
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

  const posterUrl = movie?.medias?.find((m) => m.mediaType === 'POSTER')?.mediaUrl;

  if (isLoading) {
    return (
      <AdminPage className="amf-page">
        <div className="adm-loading">
          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
          <p>Đang tải thông tin phim...</p>
        </div>
      </AdminPage>
    );
  }

  if (!movie) return null;

  return (
    <AdminPage className="amf-page">
      <PageHeader
        eyebrow="Quản lý nội dung"
        title={movie.title}
        description={[
          getMovieStatusLabel(movie.status),
          movie.releaseDate ? formatDateDisplay(movie.releaseDate) : null,
        ].filter(Boolean).join(' · ')}
        backTo="/admin/movies"
      />

      <div className="amd-layout">
        <aside className="amd-aside">
          {posterUrl ? (
            <PosterImage
              src={posterUrl}
              alt={movie.title}
              width={400}
              className="amd-poster"
            />
          ) : (
            <div className="amd-poster amd-poster--empty">
              <Film className="w-12 h-12" />
            </div>
          )}

          <div className="amd-aside__actions">
            <PrimaryButton
              type="button"
              className="w-full justify-center py-2.5"
              onClick={() => navigate(`/admin/movies/${movie.uuid}/edit`)}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Chỉnh sửa
            </PrimaryButton>

            <GhostButton
              type="button"
              className="w-full justify-center py-2.5 text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Đang xóa...' : 'Xóa phim'}
            </GhostButton>
          </div>
        </aside>

        <div className="amd-panel space-y-6">
          <Section title="Thông tin cơ bản">
            <dl className="amd-meta">
              <MetadataRow
                label="Trạng thái"
                value={
                  <StatusBadge variant={movieStatusVariant(movie.status)}>
                    {getMovieStatusLabel(movie.status)}
                  </StatusBadge>
                }
              />
              <MetadataRow label="Thời lượng" value={`${movie.durationMinutes} phút`} />
              <MetadataRow label="Độ tuổi" value={formatAgeRestrictionBadge(movie.ageRestriction || 'P')} />
              <MetadataRow
                label="Ngày khởi chiếu"
                value={movie.releaseDate ? formatDateDisplay(movie.releaseDate) : '—'}
              />
              <MetadataRow label="Hình thức" value={getScreeningModeLabel(movie.screeningMode)} />
              <MetadataRow
                label="Giá vé Online"
                value={
                  movie.onlinePrice != null
                    ? `${Number(movie.onlinePrice).toLocaleString('vi-VN')} VND`
                    : 'Giá mặc định hệ thống'
                }
              />
              <MetadataRow
                label="Stream"
                value={getMovieStreamingUrl(movie) ? 'Sẵn sàng' : 'Chưa tích hợp'}
              />
            </dl>
          </Section>

          <Section title="Mô tả" divided>
            <p className="amd-desc">
              {movie.description || 'Chưa có mô tả chi tiết cho phim này.'}
            </p>
          </Section>

          <Section title="Phân loại" divided>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetadataRow
                label="Thể loại"
                value={movie.genres?.length ? movie.genres.join(', ') : '—'}
              />
              <MetadataRow
                label="Quốc gia"
                value={movie.countries?.length ? movie.countries.join(', ') : '—'}
              />
            </dl>
          </Section>

          <Section
            title="Dàn diễn viên"
            description={movie.actors?.length ? `${movie.actors.length} diễn viên` : undefined}
            divided
          >
            {movie.actors?.length ? (
              <ul className="amd-cast">
                {movie.actors.map((actor, idx) => (
                  <li key={idx} className="amd-cast__item">
                    <div className="amd-cast__avatar">
                      {actor.avatarUrl ? (
                        <img src={actor.avatarUrl} alt={actor.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="amd-cast__name">
                        {actor.fullName}
                        {actor.isMain && (
                          <span className="ml-2 text-xs text-[var(--adm-text-dim)] font-medium">· Vai chính</span>
                        )}
                      </p>
                      <p className="amd-cast__role">vai {actor.characterName || 'N/A'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="amd-desc">
                Chưa có thông tin diễn viên.{' '}
                <GhostButton
                  type="button"
                  className="inline px-0 py-0 text-sm"
                  onClick={() => navigate(`/admin/movies/${movie.uuid}/edit`)}
                >
                  Thêm trong form chỉnh sửa
                </GhostButton>
              </p>
            )}
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminMovieDetailPage;

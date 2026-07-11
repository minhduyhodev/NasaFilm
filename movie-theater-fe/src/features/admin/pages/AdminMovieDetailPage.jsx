import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Edit2, Trash2, Loader2, Film } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { formatDateDisplay, getScreeningModeLabel } from '../utils/adminMovieUtils.jsx';
import { getMovieStreamingUrl } from '../../home/utils/movieUtils';
import { getMovieStatusLabel } from '../utils/statusLabels';
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  GhostButton,
  PrimaryButton,
} from '../components';
import PosterImage from '../../../shared/components/PosterImage';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

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
        notificationService.error('Khong the lay chi tiet phim');
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
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Dang tai thong tin phim...
      </div>
    );
  }

  if (!movie) return null;

  return (
    <AdminPage>
      <PageHeader
        title={movie.title}
        description={[
          getMovieStatusLabel(movie.status),
          movie.releaseDate ? formatDateDisplay(movie.releaseDate) : null,
        ].filter(Boolean).join(' · ')}
        backTo="/admin/movies"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col items-start gap-3">
          {posterUrl ? (
            <PosterImage
              src={posterUrl}
              alt={movie.title}
              width={400}
              className="w-full max-w-xs aspect-[2/3] object-cover rounded-lg"
            />
          ) : (
            <div className="w-full max-w-xs aspect-[2/3] flex items-center justify-center rounded-lg bg-white/[0.03]">
              <Film className="w-12 h-12 text-gray-600" />
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2">
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
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Section title="Thông tin cơ bản">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetadataRow label="Trạng thái" value={getMovieStatusLabel(movie.status)} />
              <MetadataRow label="Thời lượng" value={`${movie.durationMinutes} phút`} />
              <MetadataRow label="Độ tuổi" value={movie.ageRestriction || 'P'} />
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
            <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
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
              <ul className="divide-y divide-white/[0.06]">
                {movie.actors.map((actor, idx) => (
                  <li key={idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-white/[0.05] shrink-0 flex items-center justify-center">
                      {actor.avatarUrl ? (
                        <img src={actor.avatarUrl} alt={actor.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200 truncate">
                        {actor.fullName}
                        {actor.isMain && (
                          <span className="ml-2 text-xs text-gray-500">· Vai chính</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">vai {actor.characterName || 'N/A'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Chưa có thông tin diễn viên.{' '}
                <GhostButton
                  type="button"
                  className="inline px-0 py-0 text-sm text-gray-400 hover:text-white"
                  onClick={() => navigate(`/admin/movies/${movie.uuid}/edit`)}
                >
                  Them trong form chinh sua
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

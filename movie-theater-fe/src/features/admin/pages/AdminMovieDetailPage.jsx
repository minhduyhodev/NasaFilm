import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Edit2, Trash2, Loader2, ExternalLink, Film } from 'lucide-react';
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
  DangerButton,
  PrimaryButton,
} from '../components';
import PosterImage from '../../../shared/components/PosterImage';

const AdminMovieDetailPage = () => {
  const { movieUuid } = useParams();
  const navigate = useNavigate();
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
    if (!window.confirm(`Ban co chac chan muon xoa bo phim "${movie.title}" khong?`)) return;

    setIsDeleting(true);
    try {
      await movieService.deleteMovie(movie.uuid);
      notificationService.success(`Xoa thanh cong phim "${movie.title}"`);
      navigate('/admin/movies');
    } catch (err) {
      console.error('Failed to delete movie:', err);
      notificationService.error(err.message || 'Xoa phim that bai');
    } finally {
      setIsDeleting(false);
    }
  };

  const posterUrl = movie?.medias?.find((m) => m.mediaType === 'POSTER')?.mediaUrl;
  const trailerUrl = movie?.medias?.find((m) => m.mediaType === 'TRAILER')?.mediaUrl;

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
            {trailerUrl && (
              <DangerButton
                type="button"
                className="w-full justify-center py-2.5"
                onClick={() => window.open(trailerUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Trailer
              </DangerButton>
            )}

            <PrimaryButton
              type="button"
              className="w-full justify-center py-2.5"
              onClick={() => navigate(`/admin/movies/${movie.uuid}/edit`)}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Chinh sua
            </PrimaryButton>

            <GhostButton
              type="button"
              className="w-full justify-center py-2.5 text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Dang xoa...' : 'Xoa phim'}
            </GhostButton>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Section title="Thong tin co ban">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetadataRow label="Trang thai" value={getMovieStatusLabel(movie.status)} />
              <MetadataRow label="Thoi luong" value={`${movie.durationMinutes} phut`} />
              <MetadataRow label="Do tuoi" value={movie.ageRestriction || 'P'} />
              <MetadataRow
                label="Ngay khoi chieu"
                value={movie.releaseDate ? formatDateDisplay(movie.releaseDate) : '—'}
              />
              <MetadataRow label="Hinh thuc" value={getScreeningModeLabel(movie.screeningMode)} />
              <MetadataRow
                label="Gia ve Online"
                value={
                  movie.onlinePrice != null
                    ? `${Number(movie.onlinePrice).toLocaleString('vi-VN')} VND`
                    : 'Gia mac dinh he thong'
                }
              />
              <MetadataRow
                label="Stream"
                value={getMovieStreamingUrl(movie) ? 'San sang' : 'Chua tich hop'}
              />
            </dl>
          </Section>

          <Section title="Mo ta" divided>
            <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
              {movie.description || 'Chua co mo ta chi tiet cho phim nay.'}
            </p>
          </Section>

          <Section title="Phan loai" divided>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetadataRow
                label="The loai"
                value={movie.genres?.length ? movie.genres.join(', ') : '—'}
              />
              <MetadataRow
                label="Quoc gia"
                value={movie.countries?.length ? movie.countries.join(', ') : '—'}
              />
            </dl>
          </Section>

          <Section
            title="Dan dien vien"
            description={movie.actors?.length ? `${movie.actors.length} dien vien` : undefined}
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
                          <span className="ml-2 text-xs text-gray-500">· Vai chinh</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">vai {actor.characterName || 'N/A'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Chua co thong tin dien vien.{' '}
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

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, User, Play, Calendar, FileText, Archive, Pause,
  Edit2, Trash2, Loader2, ExternalLink, Clock, Globe, Film
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { formatDateDisplay, getScreeningModeLabel } from '../utils/adminMovieUtils.jsx';

const getStatusBadge = (status) => {
  switch (status) {
    case 'NOW_SHOWING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Play className="w-3 h-3 fill-emerald-400" /> Dang chieu
        </span>
      );
    case 'COMING_SOON':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Calendar className="w-3 h-3" /> Sap chieu
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 border border-gray-500/20 text-gray-400">
          <FileText className="w-3 h-3" /> Ban nhap
        </span>
      );
    case 'ENDED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
          <Archive className="w-3 h-3" /> Da ket thuc
        </span>
      );
    case 'INACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Pause className="w-3 h-3 fill-amber-400" /> Tam ngung
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 border border-gray-500/20 text-gray-400">
          {status}
        </span>
      );
  }
};

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

  const posterUrl = movie?.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl;
  const trailerUrl = movie?.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-500" />
        Dang tai thong tin phim...
      </div>
    );
  }

  if (!movie) return null;

  return (
    <div className="space-y-6 text-left max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/movies')}
            className="mt-1 p-2 rounded-lg border border-[#1A2238] bg-[#0F1322] text-gray-400 hover:text-white hover:border-[#2C3B5E] transition cursor-pointer shrink-0"
            title="Quay lai danh sach phim"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Chi tiet phim</p>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase leading-tight tracking-tight">{movie.title}</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">ID: {movie.uuid}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {getStatusBadge(movie.status)}
          {trailerUrl && (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1A2238] bg-[#0F1322] text-gray-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Xem Trailer
            </a>
          )}
          <Link
            to={`/admin/movies/${movie.uuid}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" /> Chinh sua
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Xoa phim
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-lg">
            {posterUrl ? (
              <img src={posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] flex items-center justify-center bg-gradient-to-br from-[#0F1322] to-[#1A2238]">
                <Film className="w-16 h-16 text-[#2C3B5E]" />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase text-red-500 tracking-wider mb-4">Thong tin co ban</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Thoi luong</span>
                <span className="text-white font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-500" />{movie.durationMinutes} phut</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Do tuoi</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500/10 border border-red-500/25 text-red-400 inline-block">{movie.ageRestriction || 'P'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Ngay khoi chieu</span>
                <span className="text-white font-semibold font-mono">{movie.releaseDate ? formatDateDisplay(movie.releaseDate) : 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Hinh thuc</span>
                <span className="text-white font-semibold">{getScreeningModeLabel(movie.screeningMode)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Gia ve Online</span>
                <span className="text-purple-400 font-bold font-mono">
                  {movie.onlinePrice != null ? `${Number(movie.onlinePrice).toLocaleString('vi-VN')} VND` : 'Dung gia mac dinh he thong'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Stream link</span>
                <span className="text-white font-semibold truncate block" title={movie.streamingUrl || ''}>
                  {movie.streamingUrl ? 'San sang' : 'Chua tich hop'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase text-red-500 tracking-wider mb-3">Mo ta</h2>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {movie.description || 'Chua co mo ta chi tiet cho phim nay.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-5">
              <h2 className="text-xs font-bold uppercase text-red-500 tracking-wider mb-2 flex items-center gap-1.5"><Film className="w-3.5 h-3.5" />The loai</h2>
              <div className="flex flex-wrap gap-1.5">
                {(movie.genres?.length ? movie.genres : ['N/A']).map((g) => (
                  <span key={g} className="text-[10px] bg-white/5 border border-[#1A2238] px-2 py-1 rounded text-gray-300">{g}</span>
                ))}
              </div>
            </div>
            <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-5">
              <h2 className="text-xs font-bold uppercase text-red-500 tracking-wider mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Quoc gia</h2>
              <div className="flex flex-wrap gap-1.5">
                {(movie.countries?.length ? movie.countries : ['N/A']).map((c) => (
                  <span key={c} className="text-[10px] bg-white/5 border border-[#1A2238] px-2 py-1 rounded text-gray-300">{c}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase text-red-500 tracking-wider mb-4">Dan dien vien</h2>
            {movie.actors?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {movie.actors.map((actor, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-[#0B0F19] border border-[#1A2238]">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#1A2238] bg-[#0F1322] shrink-0 flex items-center justify-center">
                      {actor.avatarUrl ? (
                        <img src={actor.avatarUrl} alt={actor.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {actor.fullName}
                        {actor.isMain && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[9px] text-amber-400 font-bold uppercase">Chinh</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">vai {actor.characterName || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-6">Chua co thong tin dien vien. Chinh sua phim de them cast.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMovieDetailPage;

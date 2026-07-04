import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Circle,
  Clapperboard,
  Film,
  Flame,
  Heart,
  Loader2,
  Moon,
  Rocket,
  Satellite,
  Star,
  Tv,
  Zap,
} from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { discoverService } from '../../../shared/services/discoverService';
import { notificationService } from '../../../shared/services/notificationService';
import { movieService } from '../../../shared/services/movieService';
import PosterImage from '../../../shared/components/PosterImage';
import FavoriteIconButton from './FavoriteIconButton';
import { getMovieDetailPath, getOnlineMoviePath, pickPosterMediaUrl } from '../utils/movieUtils';
import './MovieMatchmakerWidget.css';

/** UI metadata keyed by enum values from BE DiscoverQuizConfig */
const MOOD_UI = {
  RELAX: { label: 'Thư giãn', hint: 'Quỹ đạo nhẹ · Giải trí êm', icon: Moon },
  EXCITING: { label: 'Phấn khích', hint: 'Động cơ tối đa · Cuốn hút', icon: Flame },
  EMOTIONAL: { label: 'Cảm xúc', hint: 'Tín hiệu sâu · Chạm tim', icon: Heart },
  THRILLING: { label: 'Hồi hộp', hint: 'Zone nguy hiểm · Giật gân', icon: Zap },
};

const ORBIT_SATELLITES = [
  { id: 'clapper', icon: Clapperboard, ring: 1, tone: 'rose' },
  { id: 'rocket', icon: Rocket, ring: 2, tone: 'gold' },
  { id: 'star', icon: Star, ring: 3, tone: 'amber' },
];

const DURATION_UI = {
  SHORT: { label: 'Ngắn', hint: '< 100 phút · Bay nhanh', code: 'T+90' },
  MEDIUM: { label: 'Vừa', hint: '95–135 phút · Quỹ đạo ổn', code: 'T+120' },
  LONG: { label: 'Dài', hint: '> 120 phút · Hành trình dài', code: 'T+150' },
};

const VIEWING_UI = {
  THEATER: { label: 'Rạp chiếu', hint: 'Màn ảnh lớn · IMAX', icon: Clapperboard },
  HOME: { label: 'Living Room', hint: 'VOD · Ghế sofa', icon: Tv },
  BOTH: { label: 'Hybrid', hint: 'Rạp + nhà · Linh hoạt', icon: Film },
};

const buildConfigOptions = (values, uiMap) => {
  if (!Array.isArray(values) || !values.length) return [];
  return values
    .map((value) => {
      const meta = uiMap[value] ?? {};
      return {
        value,
        label: meta.label ?? value,
        hint: meta.hint ?? '',
        icon: meta.icon,
        code: meta.code,
      };
    })
    .filter((option) => option.label);
};

const QUIZ_STEPS = [
  {
    key: 'mood',
    title: 'Tín hiệu cảm xúc phi hành đoàn',
    subtitle: 'Mission Control cần biết tâm trạng trước khi lên quỹ đạo',
  },
  {
    key: 'duration',
    title: 'Thời lượng quỹ đạo',
    subtitle: 'Phiên xem kéo dài bao lâu trước khi hạ cánh?',
  },
  {
    key: 'viewingLocation',
    title: 'Điểm phóng & hạ cánh',
    subtitle: 'Rạp chiếu, phòng khách hay cả hai?',
  },
  {
    key: 'genreUuids',
    title: 'Chòm sao thể loại',
    subtitle: 'Chọn tối đa 2 thiên hà — có thể bỏ qua',
  },
  {
    key: 'useHistory',
    title: 'Nhật ký bay trước đó',
    subtitle: 'Dùng dữ liệu phim bạn đã lưu để cá nhân hóa?',
  },
];

const LAUNCH_STAGES = [
  'Kiểm tra tín hiệu phi hành đoàn…',
  'Tính toán quỹ đạo phim…',
  'Quét chòm sao thể loại…',
  'Ghép manifest chuyến bay…',
];

const formatDuration = (mins) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}p`;
  if (h > 0) return `${h}h`;
  return `${m}p`;
};

const MovieMatchmakerWidget = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const sectionRef = useRef(null);
  const [discoverConfig, setDiscoverConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [expandSweep, setExpandSweep] = useState(false);
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [genresError, setGenresError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [launchStage, setLaunchStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [answers, setAnswers] = useState({
    mood: '',
    duration: '',
    viewingLocation: '',
    genreUuids: [],
    useHistory: true,
  });

  const resetQuiz = useCallback(() => {
    setStep(0);
    setResult(null);
    setError('');
    setLaunchStage(0);
    setAnswers({
      mood: '',
      duration: '',
      viewingLocation: '',
      genreUuids: [],
      useHistory: true,
    });
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setExpandSweep(false);
    setExpanded(false);
    resetQuiz();
  }, [submitting, resetQuiz]);

  const handleExpandComplete = useCallback((definition) => {
    if (definition === 'animate') {
      setExpandSweep(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated && expanded) {
      setExpandSweep(false);
      setExpanded(false);
      resetQuiz();
    }
  }, [authLoading, isAuthenticated, expanded, resetQuiz]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!isAuthenticated) {
      setDiscoverConfig(null);
      setConfigLoading(false);
      return undefined;
    }

    let cancelled = false;
    setConfigLoading(true);
    discoverService
      .getConfig()
      .then((data) => {
        if (!cancelled) setDiscoverConfig(data);
      })
      .catch(() => {
        if (!cancelled) setDiscoverConfig(null);
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const loadGenres = useCallback(async () => {
    setLoadingGenres(true);
    setGenresError('');
    try {
      const data = await movieService.getGenres();
      setGenres(Array.isArray(data) ? data : []);
    } catch {
      setGenres([]);
      setGenresError('Không tải được thể loại phim. Kiểm tra backend (port 8080) rồi thử lại.');
    } finally {
      setLoadingGenres(false);
    }
  }, []);

  useEffect(() => {
    if (!expanded) return undefined;
    if (genres.length || loadingGenres) return undefined;
    loadGenres();
    return undefined;
  }, [expanded, genres.length, loadingGenres, loadGenres]);

  useEffect(() => {
    if (!submitting) return undefined;
    setLaunchStage(0);
    const interval = setInterval(() => {
      setLaunchStage((prev) => (prev < LAUNCH_STAGES.length - 1 ? prev + 1 : prev));
    }, 700);
    return () => clearInterval(interval);
  }, [submitting]);

  const maxMatches = discoverConfig?.maxMatches;
  const maxGenreSelections = discoverConfig?.maxGenreSelections ?? 0;
  const questionCount = useMemo(() => {
    if (!discoverConfig || !isAuthenticated) return null;
    return discoverConfig.authenticatedQuestionCount;
  }, [discoverConfig, isAuthenticated]);

  const moodOptions = useMemo(
    () => buildConfigOptions(discoverConfig?.moods, MOOD_UI),
    [discoverConfig],
  );

  const durationOptions = useMemo(
    () => buildConfigOptions(discoverConfig?.durations, DURATION_UI),
    [discoverConfig],
  );

  const viewingOptions = useMemo(
    () => buildConfigOptions(discoverConfig?.viewingLocations, VIEWING_UI),
    [discoverConfig],
  );

  const visibleSteps = useMemo(
    () => QUIZ_STEPS,
    [],
  );

  const currentStep = visibleSteps[step];
  const isLastStep = step >= visibleSteps.length - 1;

  const genreOptions = useMemo(
    () => [...genres].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')).slice(0, 12),
    [genres],
  );

  const canProceed = useMemo(() => {
    if (!currentStep) return false;
    switch (currentStep.key) {
      case 'mood':
        return Boolean(answers.mood);
      case 'duration':
        return Boolean(answers.duration);
      case 'viewingLocation':
        return Boolean(answers.viewingLocation);
      case 'genreUuids':
      case 'useHistory':
        return true;
      default:
        return false;
    }
  }, [answers, currentStep]);

  const toggleGenre = (uuid) => {
    setAnswers((prev) => {
      const selected = prev.genreUuids.includes(uuid)
        ? prev.genreUuids.filter((id) => id !== uuid)
        : prev.genreUuids.length >= maxGenreSelections
          ? [...prev.genreUuids.slice(1), uuid]
          : [...prev.genreUuids, uuid];
      return { ...prev, genreUuids: selected };
    });
  };

  const handleOpen = () => {
    if (!isAuthenticated) {
      notificationService.info('Vui lòng đăng nhập để dùng Movie Matchmaker.');
      navigate('/login', { state: { from: '/#movie-matchmaker' } });
      return;
    }
    if (!discoverConfig) return;
    resetQuiz();
    setExpandSweep(false);
    setExpanded(true);
    if (!genres.length && !loadingGenres) {
      loadGenres();
    }
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const renderQuizPanel = () => (
    <div className="nsf-quiz-inline">
      {expandSweep && <div className="nsf-matchmaker-cta__sweep" aria-hidden />}
      <div className="nsf-quiz-inline__control-grid" aria-hidden />
      <header className="nsf-quiz-inline__header">
        <div className="nsf-quiz-inline__brand">
          <span>Movie Matchmaker</span>
        </div>
      </header>

      {!result && !submitting && renderTimeline()}

      <div className="nsf-quiz-inline__body">
        <div className="nsf-quiz-inline__stage-grid" aria-hidden />
        <AnimatePresence mode="wait">
          {submitting ? (
            <motion.div
              key="launch"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderLaunchSequence()}
            </motion.div>
          ) : result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {renderResults()}
            </motion.div>
          ) : (
            <motion.div
              key={currentStep?.key}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }}
              className="nsf-quiz__step"
            >
              <div className="nsf-quiz__step-meta">
                <span className="nsf-quiz__step-phase">Câu {step + 1}</span>
              </div>
              <h3 className="nsf-quiz__step-title">{currentStep?.title}</h3>
              <p className="nsf-quiz__step-subtitle">
                {currentStep?.key === 'genreUuids'
                  ? `Chọn tối đa ${maxGenreSelections} thiên hà — có thể bỏ qua`
                  : currentStep?.subtitle}
              </p>
              {renderStepContent()}
              {error && <p className="nsf-quiz__error">{error}</p>}
              <footer className="nsf-quiz__footer">
                <button type="button" className="nsf-quiz__back" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                  {step === 0 ? 'Hủy nhiệm vụ' : 'Quay lại'}
                </button>
                <button
                  type="button"
                  className="nsf-quiz__next"
                  disabled={!canProceed}
                  onClick={handleNext}
                >
                  {isLastStep ? (
                    <span className="nsf-quiz__next-content">Cất cánh · Ghép chuyến bay</span>
                  ) : (
                    <span className="nsf-quiz__next-content">
                      Xác nhận tọa độ
                      <span className="nsf-quiz__next-arrow" aria-hidden>
                        →
                      </span>
                    </span>
                  )}
                </button>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const submitMatch = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        mood: answers.mood,
        duration: answers.duration,
        viewingLocation: answers.viewingLocation,
        genreUuids: answers.genreUuids.slice(0, maxGenreSelections),
        useHistory: isAuthenticated ? answers.useHistory : false,
      };
      const data = await discoverService.match(payload);
      setResult(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 502 || err?.code === 'ERR_NETWORK') {
        setError('Mất tín hiệu Mission Control. Khởi động lại backend (port 8080) rồi thử cất cánh lại.');
      } else {
        setError(err?.response?.data?.message || err?.message || 'Không thể ghép chuyến bay. Thử lại sau.');
      }
    } finally {
      setSubmitting(false);
      setLaunchStage(0);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      submitMatch();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (result) {
      setResult(null);
      return;
    }
    if (step === 0) {
      handleClose();
      return;
    }
    setStep((prev) => prev - 1);
  };

  const renderTimeline = () => (
    <ol className="nsf-quiz__timeline" aria-label="Tiến trình nhiệm vụ">
      {visibleSteps.map((item, index) => {
        const done = index < step || Boolean(result);
        const active = index === step && !result;
        return (
          <li
            key={item.key}
            className={`nsf-quiz__timeline-node ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
          >
            <span className="nsf-quiz__timeline-dot">
              {active && (
                <>
                  <span className="nsf-quiz__timeline-pulse nsf-quiz__timeline-pulse--1" aria-hidden />
                  <span className="nsf-quiz__timeline-pulse nsf-quiz__timeline-pulse--2" aria-hidden />
                </>
              )}
            </span>
            <span className="nsf-quiz__timeline-label">Câu {index + 1}</span>
          </li>
        );
      })}
    </ol>
  );

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.key) {
      case 'mood':
        return (
          <div className="nsf-quiz__options nsf-quiz__options--grid-2">
            {moodOptions.map((option) => {
              const MoodIcon = option.icon;
              return (
              <button
                key={option.value}
                type="button"
                className={`nsf-quiz__option ${answers.mood === option.value ? 'is-selected' : ''}`}
                onClick={() => setAnswers((prev) => ({ ...prev, mood: option.value }))}
              >
                <span className="nsf-quiz__option-icon-wrap" aria-hidden>
                  <MoodIcon className="nsf-quiz__option-icon" strokeWidth={2} />
                </span>
                <span className="nsf-quiz__option-label">{option.label}</span>
                <span className="nsf-quiz__option-hint">{option.hint}</span>
              </button>
              );
            })}
          </div>
        );
      case 'duration':
        return (
          <div className="nsf-quiz__options nsf-quiz__options--grid-3">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`nsf-quiz__option ${answers.duration === option.value ? 'is-selected' : ''}`}
                onClick={() => setAnswers((prev) => ({ ...prev, duration: option.value }))}
              >
                <span className="nsf-quiz__option-code">{option.code}</span>
                <span className="nsf-quiz__option-label">{option.label}</span>
                <span className="nsf-quiz__option-hint">{option.hint}</span>
              </button>
            ))}
          </div>
        );
      case 'viewingLocation':
        return (
          <div className="nsf-quiz__options nsf-quiz__options--grid-3">
            {viewingOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`nsf-quiz__option nsf-quiz__option--icon ${answers.viewingLocation === option.value ? 'is-selected' : ''}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, viewingLocation: option.value }))}
                >
                  <Icon className="nsf-quiz__option-icon" />
                  <span className="nsf-quiz__option-label">{option.label}</span>
                  <span className="nsf-quiz__option-hint">{option.hint}</span>
                </button>
              );
            })}
          </div>
        );
      case 'genreUuids':
        if (loadingGenres) {
          return (
            <div className="nsf-quiz__loading">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải thể loại phim…
            </div>
          );
        }
        if (genresError) {
          return (
            <div className="nsf-quiz__genres-error">
              <p className="nsf-quiz__error">{genresError}</p>
              <button type="button" className="nsf-quiz__back" onClick={loadGenres}>
                Thử tải lại
              </button>
            </div>
          );
        }
        if (!genreOptions.length) {
          return (
            <p className="nsf-quiz__step-subtitle">
              Chưa có thể loại phim — bạn có thể bỏ qua bước này.
            </p>
          );
        }
        return (
          <div className="nsf-quiz__genres">
            {genreOptions.map((genre) => (
              <button
                key={genre.uuid}
                type="button"
                className={`nsf-quiz__genre-chip ${answers.genreUuids.includes(genre.uuid) ? 'is-selected' : ''}`}
                onClick={() => toggleGenre(genre.uuid)}
              >
                {genre.name}
              </button>
            ))}
          </div>
        );
      case 'useHistory':
        return (
          <div className="nsf-quiz__history">
            <button
              type="button"
              className={`nsf-quiz__option nsf-quiz__option--wide ${answers.useHistory ? 'is-selected' : ''}`}
              onClick={() => setAnswers((prev) => ({ ...prev, useHistory: true }))}
            >
              <span className="nsf-quiz__option-label">Có — dùng nhật ký bay</span>
              <span className="nsf-quiz__option-hint">Gợi ý theo phim yêu thích đã lưu</span>
            </button>
            <button
              type="button"
              className={`nsf-quiz__option nsf-quiz__option--wide ${!answers.useHistory ? 'is-selected' : ''}`}
              onClick={() => setAnswers((prev) => ({ ...prev, useHistory: false }))}
            >
              <span className="nsf-quiz__option-label">Không — khám phá chòm sao mới</span>
              <span className="nsf-quiz__option-hint">Bay vào vùng phim chưa từng ghé</span>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderLaunchSequence = () => (
    <div className="nsf-quiz__launch">
      <div className="nsf-quiz__launch-rocket" aria-hidden>
        <Rocket className="h-10 w-10 nsf-quiz__launch-rocket-icon" />
      </div>
      <p className="nsf-quiz__launch-title">Đang chuẩn bị cất cánh</p>
      <ul className="nsf-quiz__launch-stages">
        {LAUNCH_STAGES.map((label, index) => {
          const isDone = index < launchStage;
          const isActive = index === launchStage;
          return (
          <li
            key={label}
            className={`nsf-quiz__launch-stage ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
          >
            <span className="nsf-quiz__launch-stage-icon" aria-hidden>
              {isDone ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Circle className={`h-3.5 w-3.5 ${isActive ? 'nsf-quiz__launch-stage-icon--active' : ''}`} strokeWidth={2} />
              )}
            </span>
            {label}
          </li>
          );
        })}
      </ul>
    </div>
  );

  const renderResults = () => {
    if (!result?.matches?.length) return null;

    return (
      <div className="nsf-quiz__manifest">
        <div className="nsf-quiz__manifest-header">
          <div className="nsf-quiz__manifest-badge">CLEARED FOR LAUNCH</div>
          <div className="nsf-quiz__manifest-flight">
            <Rocket className="h-5 w-5" />
            <div>
              <div className="nsf-quiz__manifest-label">{result.flightLabel || 'Chuyến bay NASA'}</div>
              <div className="nsf-quiz__manifest-code">{result.flightCode}</div>
            </div>
          </div>
          <p className="nsf-quiz__manifest-copy">
            Manifest gồm {result.matches.length} phim khớp chòm sao của bạn — sẵn sàng đặt vé hoặc xem VOD.
          </p>
        </div>

        <div className="nsf-quiz__manifest-grid">
          {result.matches.map((movie, index) => {
            const poster = pickPosterMediaUrl(movie);
            const detailPath = getMovieDetailPath(movie.uuid);
            const onlinePath = getOnlineMoviePath(movie.uuid);
            const showOnline = movie.screeningMode === 'ONLINE_ONLY' || movie.screeningMode === 'BOTH';

            return (
              <article key={movie.uuid} className="nsf-quiz__manifest-card">
                <div className="nsf-quiz__manifest-rank">SEAT {index + 1}</div>
                <div className="nsf-quiz__manifest-poster">
                  <PosterImage src={poster} alt={movie.title} />
                  <FavoriteIconButton movieUuid={movie.uuid} className="nsf-quiz__manifest-favorite" />
                </div>
                <div className="nsf-quiz__manifest-body">
                  <h4 className="nsf-quiz__manifest-title">{movie.title}</h4>
                  <p className="nsf-quiz__manifest-meta">
                    {[movie.genres?.[0], formatDuration(movie.durationMinutes)].filter(Boolean).join(' · ')}
                  </p>
                  <ul className="nsf-quiz__manifest-reasons">
                    {(movie.reasons || []).slice(0, 2).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="nsf-quiz__manifest-actions">
                    <Link
                      to={detailPath}
                      className="nsf-quiz__manifest-cta nsf-quiz__manifest-cta--primary"
                    >
                      Đặt vé
                    </Link>
                    {showOnline && (
                      <Link to={onlinePath} className="nsf-quiz__manifest-cta">
                        Xem VOD
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <button type="button" className="nsf-quiz__manifest-retry" onClick={resetQuiz}>
          Lập nhiệm vụ mới
        </button>
      </div>
    );
  };

  return (
    <motion.section
      ref={sectionRef}
      layout
      className={`nsf-matchmaker-cta ${expanded ? 'nsf-matchmaker-cta--expanded' : ''}`}
      aria-label="Trạm Cất Cánh Movie Matchmaker"
      transition={{ layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
    >
      <div className="nsf-matchmaker-cta__content">
        <AnimatePresence initial={false} mode="wait">
          {!expanded ? (
          <motion.div
            key="cta-banner"
            className="nsf-matchmaker-cta__inner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="nsf-matchmaker-cta__copy">
              <h2 className="nsf-matchmaker-cta__title">
                {configLoading || questionCount == null || maxMatches == null ? (
                  <>Trả lời vài tọa độ — nhận ngay phim thuộc chòm sao của bạn</>
                ) : (
                  <>
                    Trả lời{' '}
                    <span className="nsf-matchmaker-cta__accent">{questionCount} tọa độ</span>
                    {' '}— nhận ngay{' '}
                    <span className="nsf-matchmaker-cta__accent">{maxMatches} phim</span>
                    {' '}thuộc chòm sao của bạn
                  </>
                )}
              </h2>
              <button
                type="button"
                className="nsf-matchmaker-cta__btn"
                onClick={handleOpen}
                disabled={authLoading || (isAuthenticated && (configLoading || !discoverConfig))}
              >
                {authLoading
                  ? 'Đang kiểm tra phiên đăng nhập…'
                  : !isAuthenticated
                    ? 'Đăng nhập để tìm phim'
                  : configLoading
                  ? 'Đang kết nối Mission Control…'
                  : !discoverConfig
                    ? 'Mission Control chưa sẵn sàng'
                    : 'Tìm phim cho tôi'}
              </button>
            </div>
            <div className="nsf-matchmaker-cta__orbit-wrap" aria-hidden>
              <div className="nsf-matchmaker-cta__orbit">
                <div className="nsf-matchmaker-cta__orbit-ring nsf-matchmaker-cta__orbit-ring--outer" />
                <div className="nsf-matchmaker-cta__orbit-ring nsf-matchmaker-cta__orbit-ring--mid" />
                <div className="nsf-matchmaker-cta__orbit-ring nsf-matchmaker-cta__orbit-ring--inner" />

                <div className="nsf-matchmaker-cta__orbit-core">
                  <span className="nsf-matchmaker-cta__orbit-core-halo nsf-matchmaker-cta__orbit-core-halo--1" />
                  <span className="nsf-matchmaker-cta__orbit-core-halo nsf-matchmaker-cta__orbit-core-halo--2" />
                  <div className="nsf-matchmaker-cta__orbit-core-nucleus">
                    <Satellite className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                </div>

                {ORBIT_SATELLITES.map(({ id, icon: OrbitIcon, ring, tone }) => (
                  <div
                    key={id}
                    className={`nsf-matchmaker-cta__orbit-track nsf-matchmaker-cta__orbit-track--ring-${ring}`}
                  >
                    <div className="nsf-matchmaker-cta__orbit-node">
                      <div
                        className={`nsf-matchmaker-cta__orbit-node-upright nsf-matchmaker-cta__orbit-node-upright--ring-${ring} nsf-matchmaker-cta__orbit-node-upright--${tone}`}
                      >
                        <OrbitIcon className="nsf-matchmaker-cta__orbit-node-icon" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="quiz-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={handleExpandComplete}
          >
            {renderQuizPanel()}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default MovieMatchmakerWidget;

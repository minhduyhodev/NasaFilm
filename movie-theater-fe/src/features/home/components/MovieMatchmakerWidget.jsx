import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import './ProfilePreferencesTab.css';

const ICON_MAP = {
  Moon,
  Flame,
  Heart,
  Zap,
  Clapperboard,
  Tv,
  Film,
};

const MOOD_UI = {
  RELAX: { label: 'Thư giãn', hint: 'Nhẹ nhàng · Giải trí êm', icon: Moon },
  EXCITING: { label: 'Phấn khích', hint: 'Sôi động · Cuốn hút', icon: Flame },
  EMOTIONAL: { label: 'Cảm xúc', hint: 'Sâu lắng · Chạm tim', icon: Heart },
  THRILLING: { label: 'Hồi hộp', hint: 'Kịch tính · Giật gân', icon: Zap },
};

const ORBIT_SATELLITES = [
  { id: 'clapper', icon: Clapperboard, ring: 1, tone: 'rose' },
  { id: 'rocket', icon: Rocket, ring: 2, tone: 'gold' },
  { id: 'star', icon: Star, ring: 3, tone: 'amber' },
];

const DURATION_UI = {
  SHORT: { label: 'Ngắn', hint: 'Dưới 100 phút · Xem nhanh', code: '<100p' },
  MEDIUM: { label: 'Vừa', hint: '95–135 phút · Vừa đủ', code: '~2h' },
  LONG: { label: 'Dài', hint: 'Trên 120 phút · Xem trọn vẹn', code: '>2h' },
};

const VIEWING_UI = {
  THEATER: { label: 'Rạp chiếu', hint: 'Màn ảnh lớn · Trải nghiệm rạp', icon: Clapperboard },
  HOME: { label: 'Xem tại nhà', hint: 'Online · Thoải mái tại nhà', icon: Tv },
  BOTH: { label: 'Cả hai', hint: 'Rạp hoặc nhà · Linh hoạt', icon: Film },
};

const resolveIcon = (iconKey, fallbackIcon) => {
  if (iconKey && ICON_MAP[iconKey]) return ICON_MAP[iconKey];
  return fallbackIcon;
};

const buildConfigOptions = (keys, richOptions, uiMap) => {
  if (Array.isArray(richOptions) && richOptions.length) {
    return richOptions
      .filter((item) => item && (item.active !== false) && (item.key || item.optionKey))
      .map((item) => {
        const key = item.key || item.optionKey;
        const fallback = uiMap[key] ?? {};
        return {
          value: key,
          label: item.label || fallback.label || key,
          hint: item.hint || fallback.hint || '',
          icon: resolveIcon(item.iconKey, fallback.icon),
          code: item.code || fallback.code,
        };
      })
      .filter((option) => option.label);
  }

  if (!Array.isArray(keys) || !keys.length) return [];
  return keys
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
    title: 'Cảm xúc của bạn hôm nay',
    subtitle: 'Chúng tôi cần biết tâm trạng của bạn để gợi ý phim phù hợp nhất',
  },
  {
    key: 'duration',
    title: 'Bạn muốn xem bao lâu?',
    subtitle: 'Chọn khoảng thời lượng phù hợp với lịch trình của bạn',
  },
  {
    key: 'viewingLocation',
    title: 'Bạn muốn xem ở đâu?',
    subtitle: 'Rạp chiếu, xem tại nhà, hay linh hoạt cả hai?',
  },
  {
    key: 'genreUuids',
    title: 'Thể loại bạn thích',
    subtitle: 'Chọn tối đa 2 thể loại — có thể bỏ qua',
  },
  {
    key: 'useHistory',
    title: 'Gợi ý theo sở thích của bạn',
    subtitle: 'Dùng phim bạn đã lưu để cá nhân hóa kết quả?',
  },
];

const LAUNCH_STAGES = [
  'Đang đọc cảm xúc của bạn…',
  'Đang lọc theo thời lượng…',
  'Đang khớp thể loại yêu thích…',
  'Đang chọn phim phù hợp nhất…',
];

const formatDuration = (mins) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}p`;
  if (h > 0) return `${h}h`;
  return `${m}p`;
};

const MovieMatchmakerWidget = ({ layout = 'banner' }) => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const sectionRef = useRef(null);
  const [discoverConfig, setDiscoverConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
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
    if (!isAuthenticated) {
      setDiscoverConfig(null);
      setConfigLoading(false);
      if (expanded) {
        setExpandSweep(false);
        setExpanded(false);
        resetQuiz();
      }
    }
  }, [authLoading, isAuthenticated, expanded, resetQuiz]);

  useEffect(() => {
    if (!expanded || authLoading || !isAuthenticated) return undefined;
    // Không phụ thuộc configLoading — nếu thêm vào deps sẽ cleanup ngay sau
    // setConfigLoading(true) và đánh cancelled=true → kẹt "Đang tải câu hỏi…" mãi.
    if (discoverConfig) return undefined;

    let cancelled = false;
    setConfigLoading(true);
    discoverService
      .getConfig()
      .then((data) => {
        if (cancelled) return;
        setDiscoverConfig(data && typeof data === 'object' ? data : {});
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback local để quiz vẫn chạy khi API lỗi.
        setDiscoverConfig({});
        notificationService.error('Không tải được cấu hình Matchmaker. Dùng bộ câu hỏi mặc định.');
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, authLoading, isAuthenticated, discoverConfig]);

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

  const maxMatches = discoverConfig?.maxMatches ?? 3;
  const maxGenreSelections = discoverConfig?.maxGenreSelections ?? 2;
  const questionCount = useMemo(() => {
    if (!isAuthenticated) return null;
    const raw = Number(discoverConfig?.authenticatedQuestionCount);
    if (!Number.isFinite(raw)) return 5;
    return Math.min(5, Math.max(3, Math.round(raw)));
  }, [discoverConfig, isAuthenticated]);

  const moodOptions = useMemo(
    () =>
      buildConfigOptions(
        discoverConfig?.moods?.length ? discoverConfig.moods : Object.keys(MOOD_UI),
        discoverConfig?.moodOptions,
        MOOD_UI,
      ),
    [discoverConfig],
  );

  const durationOptions = useMemo(
    () =>
      buildConfigOptions(
        discoverConfig?.durations?.length ? discoverConfig.durations : Object.keys(DURATION_UI),
        discoverConfig?.durationOptions,
        DURATION_UI,
      ),
    [discoverConfig],
  );

  const viewingOptions = useMemo(
    () =>
      buildConfigOptions(
        discoverConfig?.viewingLocations?.length
          ? discoverConfig.viewingLocations
          : Object.keys(VIEWING_UI),
        discoverConfig?.viewingOptions,
        VIEWING_UI,
      ),
    [discoverConfig],
  );

  // 3 = mood + duration + viewing (bắt buộc BE) · 4 + genre · 5 + useHistory
  const visibleSteps = useMemo(() => {
    const count = questionCount ?? QUIZ_STEPS.length;
    return QUIZ_STEPS.slice(0, count);
  }, [questionCount]);

  useEffect(() => {
    if (step > visibleSteps.length - 1) {
      setStep(Math.max(0, visibleSteps.length - 1));
    }
  }, [step, visibleSteps.length]);

  const currentStep = visibleSteps[step];
  const isLastStep = step >= visibleSteps.length - 1;

  const genreOptions = useMemo(
    () => [...genres].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')),
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
          <span>Phim dành cho bạn</span>
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
          ) : configLoading ? (
            <motion.div
              key="config-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="nsf-quiz__loading"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải câu hỏi…
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
                  ? `Chọn tối đa ${maxGenreSelections} thể loại — có thể bỏ qua`
                  : currentStep?.subtitle}
              </p>
              {renderStepContent()}
              {error && <p className="nsf-quiz__error">{error}</p>}
              <footer className="nsf-quiz__footer">
                <button type="button" className="nsf-quiz__back" onClick={handleBack}>
                  <ArrowLeft className="nsf-quiz__btn-icon" strokeWidth={2} />
                  {step === 0 ? 'Hủy' : 'Quay lại'}
                </button>
                <button
                  type="button"
                  className="nsf-quiz__next"
                  disabled={!canProceed}
                  onClick={handleNext}
                >
                  {isLastStep ? (
                    <span className="nsf-quiz__next-content">Xem kết quả</span>
                  ) : (
                    <span className="nsf-quiz__next-content">
                      Xác nhận
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
        genreUuids: visibleSteps.some((s) => s.key === 'genreUuids')
          ? answers.genreUuids.slice(0, maxGenreSelections)
          : [],
        useHistory: visibleSteps.some((s) => s.key === 'useHistory')
          ? Boolean(answers.useHistory)
          : false,
      };
      const data = await discoverService.match(payload);
      setResult(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 502 || err?.code === 'ERR_NETWORK') {
        setError('Không kết nối được máy chủ. Hãy khởi động lại backend (port 8080) rồi thử lại.');
      } else {
        setError(err?.response?.data?.message || err?.message || 'Không thể tìm phim phù hợp. Thử lại sau.');
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
    <ol className="nsf-quiz__timeline" aria-label="Tiến trình câu hỏi">
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
          <div className="nsf-quiz__genres-panel">
            <div className="profile-preferences-tab__chips nsf-quiz__genres-chips">
              {genreOptions.map((genre) => {
                const genreId = String(genre.uuid);
                const active = answers.genreUuids.some((id) => String(id) === genreId);
                return (
                  <button
                    key={genre.uuid}
                    type="button"
                    className={`profile-preferences-tab__chip${active ? ' is-active' : ''}`}
                    onClick={() => toggleGenre(genre.uuid)}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
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
              <span className="nsf-quiz__option-label">Có — dùng sở thích đã lưu</span>
              <span className="nsf-quiz__option-hint">Gợi ý theo phim yêu thích của bạn</span>
            </button>
            <button
              type="button"
              className={`nsf-quiz__option nsf-quiz__option--wide ${!answers.useHistory ? 'is-selected' : ''}`}
              onClick={() => setAnswers((prev) => ({ ...prev, useHistory: false }))}
            >
              <span className="nsf-quiz__option-label">Không — khám phá phim mới</span>
              <span className="nsf-quiz__option-hint">Gợi ý theo câu trả lời vừa rồi</span>
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
      <p className="nsf-quiz__launch-title">Đang tìm phim dành cho bạn</p>
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
          <div className="nsf-quiz__manifest-badge">Kết quả dành cho bạn</div>
          <div className="nsf-quiz__manifest-flight">
            <Film className="h-5 w-5" />
            <div>
              <div className="nsf-quiz__manifest-label">{result.flightLabel || 'Gợi ý phim'}</div>
              <div className="nsf-quiz__manifest-code">{result.flightCode}</div>
            </div>
          </div>
          <p className="nsf-quiz__manifest-copy">
            Có {result.matches.length} phim phù hợp với bạn — sẵn sàng đặt vé hoặc xem online.
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
                <div className="nsf-quiz__manifest-rank">#{index + 1}</div>
                <div className="nsf-quiz__manifest-poster">
                  <PosterImage src={poster} alt={movie.title} width={500} loading="eager" />
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
          Làm lại từ đầu
        </button>
      </div>
    );
  };

  const isPanel = layout === 'panel';

  if (!authLoading && !isAuthenticated) {
    if (!isPanel) return null;

    return (
      <section className="nsf-matchmaker-cta nsf-matchmaker-cta--panel" aria-label="Phim dành cho bạn">
        <div className="nsf-matchmaker-cta__content">
          <div className="nsf-matchmaker-cta__inner">
            <div className="nsf-matchmaker-cta__copy">
              <p className="nsf-matchmaker-cta__panel-hint">
                Đăng nhập để nhận gợi ý phim theo tâm trạng của bạn
              </p>
              <button
                type="button"
                className="nsf-matchmaker-cta__btn"
                onClick={() => navigate('/login', { state: { from: '/#home-matchmaker' } })}
              >
                Đăng nhập để tìm phim
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
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      ref={sectionRef}
      layout={!isPanel}
      className={`nsf-matchmaker-cta${expanded ? ' nsf-matchmaker-cta--expanded' : ''}${isPanel ? ' nsf-matchmaker-cta--panel' : ''}`}
      aria-label="Phim dành cho bạn"
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
              {!isPanel ? (
                <h2 className="nsf-matchmaker-cta__title">
                  {configLoading || questionCount == null || maxMatches == null ? (
                    <>Trả lời vài câu hỏi để tìm ra bộ phim phù hợp với bạn</>
                  ) : (
                    <>
                      Trả lời{' '}
                      <span className="nsf-matchmaker-cta__accent">{questionCount}</span>
                      {' '}câu hỏi để tìm ra{' '}
                      <span className="nsf-matchmaker-cta__accent">{maxMatches}</span>
                      {' '}bộ phim phù hợp với bạn
                    </>
                  )}
                </h2>
              ) : (
                <p className="nsf-matchmaker-cta__panel-hint">
                  {configLoading || questionCount == null || maxMatches == null ? (
                    <>Trả lời vài câu hỏi để tìm phim phù hợp</>
                  ) : (
                    <>
                      Trả lời{' '}
                      <span className="nsf-matchmaker-cta__accent">{questionCount}</span>
                      {' '}câu hỏi · nhận{' '}
                      <span className="nsf-matchmaker-cta__accent">{maxMatches}</span>
                      {' '}phim
                    </>
                  )}
                </p>
              )}
              <button
                type="button"
                className="nsf-matchmaker-cta__btn"
                onClick={handleOpen}
                disabled={authLoading}
              >
                {authLoading
                  ? 'Đang kiểm tra phiên đăng nhập…'
                  : !isAuthenticated
                    ? 'Đăng nhập để tìm phim'
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

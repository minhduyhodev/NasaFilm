import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Loader2,
  LogIn,
  MessageSquare,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Tv,
} from 'lucide-react';
import { movieReviewService } from '../../../shared/services/movieReviewService';
import { notificationService } from '../../../shared/services/notificationService';
import { showMissionCompletionToasts } from '../../../shared/services/missionService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import UserAvatar from '../../../shared/components/UserAvatar';
import MovieReviewPagination from './MovieReviewPagination';
import StarRating from './StarRating';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import {
  MAX_VIBE_TAGS_PER_REVIEW,
  VIBE_TAG_CLOUD_COLLAPSED_LIMIT,
  VIBE_TAG_COLLAPSED_LIMIT,
  VIBE_TAG_SEARCH_MIN_CATALOG,
  buildCollapsedVibeTagList,
  getVibeTagLabel,
  loadReviewVibeTags,
  matchesVibeTagQuery,
} from '../../../shared/constants/reviewVibeTags';
import Swal from 'sweetalert2';
import './MovieReviewsSection.css';

const DEFAULT_REVIEWS_PER_PAGE = 10;

const REVIEW_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất' },
  { value: 'rating,desc', label: 'Sao cao nhất' },
  { value: 'rating,asc', label: 'Sao thấp nhất' },
];

const RATING_LABELS = {
  0: 'Chọn số sao',
  1: 'Không thích',
  2: 'Tạm được',
  3: 'Ổn',
  4: 'Rất hay',
  5: 'Xuất sắc',
};

const formatReviewDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const MovieReviewsSection = ({
  movieUuid,
  movieTitle,
  showTheaterCta = true,
  showOnlineCta = true,
  isExpanded: controlledExpanded,
  onExpandedChange,
  onSummaryChange,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const confirm = useConfirm();

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;

  const setExpanded = (value) => {
    onExpandedChange?.(value);
    if (controlledExpanded === undefined) {
      setInternalExpanded(value);
    }
  };

  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_REVIEWS_PER_PAGE);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportingId, setReportingId] = useState(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewSort, setReviewSort] = useState('createdAt,desc');
  const [activeVibeTag, setActiveVibeTag] = useState('');
  const [selectedVibeTags, setSelectedVibeTags] = useState([]);
  const [vibeTagCatalog, setVibeTagCatalog] = useState([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isVibePickerExpanded, setIsVibePickerExpanded] = useState(false);
  const [vibePickerSearch, setVibePickerSearch] = useState('');
  const [isVibeCloudExpanded, setIsVibeCloudExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadReviewVibeTags()
      .then((tags) => {
        if (!cancelled) {
          setVibeTagCatalog(tags);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVibeTagCatalog([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSummary = useCallback(async () => {
    const data = await movieReviewService.getSummary(movieUuid);
    setSummary(data);
    onSummaryChange?.(data);
    return data;
  }, [movieUuid, onSummaryChange]);

  const loadReviews = useCallback(async (pageNumber = 0, pageSize = itemsPerPage) => {
    const data = await movieReviewService.getReviews(movieUuid, pageNumber, pageSize, {
      sort: reviewSort,
      onlyWithComment: false,
      vibeTag: activeVibeTag || undefined,
    });
    const content = data?.content || [];
    setReviews(content);
    setPage(data?.number ?? pageNumber);
    setTotalItems(data?.totalElements ?? 0);
    return data;
  }, [movieUuid, itemsPerPage, reviewSort, activeVibeTag]);

  const fetchReviewsPage = useCallback(
    async (pageNumber = 0, { initial = false, pageSize } = {}) => {
      const effectivePageSize = pageSize ?? itemsPerPage;
      if (initial) {
        setIsReviewsLoading(true);
      } else {
        setIsPageLoading(true);
      }
      try {
        const data = await loadReviews(pageNumber, effectivePageSize);
        if ((data?.content || []).length === 0 && pageNumber > 0) {
          await loadReviews(pageNumber - 1, effectivePageSize);
        }
        setReviewsLoaded(true);
      } catch (error) {
        notificationService.error(error.message || 'Không thể tải đánh giá phim.');
      } finally {
        setIsReviewsLoading(false);
        setIsPageLoading(false);
      }
    },
    [loadReviews, itemsPerPage],
  );

  const refreshAll = useCallback(async () => {
    try {
      await loadSummary();
      if (isExpanded) {
        await fetchReviewsPage(0);
      } else {
        setReviewsLoaded(false);
      }
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải đánh giá phim.');
    }
  }, [isExpanded, loadSummary, fetchReviewsPage]);

  useEffect(() => {
    if (!movieUuid) return;

    let cancelled = false;

    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      setReviewsLoaded(false);
      setReviews([]);
      setTotalItems(0);
      setActiveVibeTag('');
      setSelectedVibeTags([]);
      try {
        await loadSummary();
      } catch (error) {
        if (!cancelled) {
          notificationService.error(error.message || 'Không thể tải đánh giá phim.');
        }
      } finally {
        if (!cancelled) {
          setIsSummaryLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [movieUuid, loadSummary, isAuthenticated]);

  useEffect(() => {
    if (!isExpanded || !movieUuid || reviewsLoaded) return;
    fetchReviewsPage(0, { initial: true });
  }, [isExpanded, movieUuid, reviewsLoaded, fetchReviewsPage]);

  useEffect(() => {
    if (!isExpanded || !movieUuid || !reviewsLoaded) return;
    setPage(0);
    fetchReviewsPage(0);
  }, [reviewSort, activeVibeTag, isExpanded, movieUuid, reviewsLoaded, fetchReviewsPage]);

  useEffect(() => {
    if (!isSortMenuOpen) return undefined;
    const handleOutsideClick = () => setIsSortMenuOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isSortMenuOpen]);

  const handlePageChange = (nextPage) => {
    fetchReviewsPage(nextPage - 1);
    document.getElementById('movie-reviews-list')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleItemsPerPageChange = (size) => {
    setItemsPerPage(size);
    setPage(0);
    fetchReviewsPage(0, { pageSize: size });
  };

  const handleToggleVibeTag = (code) => {
    setSelectedVibeTags((prev) => {
      if (prev.includes(code)) {
        return prev.filter((item) => item !== code);
      }
      if (prev.length >= MAX_VIBE_TAGS_PER_REVIEW) {
        notificationService.warning(`Chỉ chọn tối đa ${MAX_VIBE_TAGS_PER_REVIEW} vibe tag.`);
        return prev;
      }
      return [...prev, code];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      notificationService.info('Vui lòng đăng nhập để đánh giá phim.');
      navigate('/login', { state: { from: `/movie/${movieUuid}` } });
      return;
    }

    if (rating < 1) {
      notificationService.warning('Vui lòng chọn số sao từ 1 đến 5.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewResponse = await movieReviewService.createReview(movieUuid, {
        rating,
        comment,
        vibeTags: selectedVibeTags,
      });
      notificationService.success('Đã gửi đánh giá mới.');
      showMissionCompletionToasts(reviewResponse?.missionCompletions);
      await refreshAll();
      setRating(0);
      setComment('');
      setSelectedVibeTags([]);
      setIsVibePickerExpanded(false);
      setVibePickerSearch('');
    } catch (error) {
      notificationService.error(error.message || 'Không thể gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewUuid) => {
    const ok = await confirm({
      title: 'Xóa đánh giá',
      message: 'Bạn có chắc muốn xóa đánh giá của mình? Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa đánh giá',
      variant: 'danger',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await movieReviewService.deleteReview(movieUuid, reviewUuid);
      notificationService.success('Đã xóa đánh giá.');
      await refreshAll();
    } catch (error) {
      notificationService.error(error.message || 'Không thể xóa đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollapse = () => {
    setExpanded(false);
    document.getElementById('movie-reviews')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleReportReview = async (review) => {
    if (!isAuthenticated) {
      notificationService.info('Vui lòng đăng nhập để báo cáo đánh giá.');
      navigate('/login', { state: { from: `/movie/${movieUuid}` } });
      return;
    }

    const result = await Swal.fire({
      title: 'Báo cáo đánh giá',
      input: 'textarea',
      inputLabel: 'Lý do báo cáo',
      inputPlaceholder: 'Mô tả vấn đề với bình luận này...',
      inputAttributes: { maxlength: 1000 },
      showCancelButton: true,
      confirmButtonText: 'Gửi báo cáo',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#334155',
      background: '#0f1322',
      color: '#f1f5f9',
      inputValidator: (value) => {
        if (!value?.trim()) {
          return 'Vui lòng nhập lý do báo cáo.';
        }
        return undefined;
      },
    });

    if (!result.isConfirmed) return;

    setReportingId(review.uuid);
    try {
      await movieReviewService.reportReview(movieUuid, review.uuid, result.value.trim());
      notificationService.success('Đã gửi báo cáo. Admin sẽ xem xét sớm nhất.');
      setReviews((prev) =>
        prev.map((item) =>
          item.uuid === review.uuid ? { ...item, reportedByMe: true } : item,
        ),
      );
      await fetchReviewsPage(page);
    } catch (error) {
      notificationService.error(error.message || 'Không thể gửi báo cáo.');
    } finally {
      setReportingId(null);
    }
  };

  const distribution = summary?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const hasReviews = (summary?.totalReviews ?? 0) > 0;
  const averageDisplay = hasReviews ? summary.averageRating.toFixed(1) : null;
  const canSubmitReview = summary?.canReview ?? false;
  const eligibilityMessage =
    summary?.reviewEligibilityMessage ||
    'Chỉ khách hàng đã mua vé chiếu rạp hoặc vé xem online mới có thể đánh giá phim này.';

  const collapsedSummary = hasReviews
    ? `${averageDisplay} điểm · ${summary.totalReviews} đánh giá`
    : 'Chưa có đánh giá — nhấn để xem và viết đánh giá';

  const activeSortLabel =
    REVIEW_SORT_OPTIONS.find((option) => option.value === reviewSort)?.label || 'Mới nhất';

  const vibeTagCounts = summary?.vibeTagCounts || {};
  const hasVibeTags = Object.keys(vibeTagCounts).length > 0;

  const vibePickerSearchActive = vibePickerSearch.trim().length > 0;
  const showVibePickerSearch = vibeTagCatalog.length >= VIBE_TAG_SEARCH_MIN_CATALOG;

  const visiblePickerTags = useMemo(() => {
    if (vibePickerSearchActive) {
      return vibeTagCatalog.filter((tag) => matchesVibeTagQuery(tag, vibePickerSearch));
    }
    if (isVibePickerExpanded || vibeTagCatalog.length <= VIBE_TAG_COLLAPSED_LIMIT) {
      return vibeTagCatalog;
    }
    return buildCollapsedVibeTagList(vibeTagCatalog, selectedVibeTags, VIBE_TAG_COLLAPSED_LIMIT);
  }, [
    vibeTagCatalog,
    vibePickerSearch,
    vibePickerSearchActive,
    isVibePickerExpanded,
    selectedVibeTags,
  ]);

  const hiddenPickerTagCount = useMemo(() => {
    if (vibePickerSearchActive || isVibePickerExpanded) return 0;
    if (vibeTagCatalog.length <= VIBE_TAG_COLLAPSED_LIMIT) return 0;
    return vibeTagCatalog.length - visiblePickerTags.length;
  }, [
    vibeTagCatalog.length,
    vibePickerSearchActive,
    isVibePickerExpanded,
    visiblePickerTags.length,
  ]);

  const visibleVibeCloudEntries = useMemo(() => {
    const entries = Object.entries(vibeTagCounts);
    if (isVibeCloudExpanded || entries.length <= VIBE_TAG_CLOUD_COLLAPSED_LIMIT) {
      return entries;
    }
    if (activeVibeTag) {
      const activeEntry = entries.find(([code]) => code === activeVibeTag);
      const rest = entries.filter(([code]) => code !== activeVibeTag);
      const limit = VIBE_TAG_CLOUD_COLLAPSED_LIMIT - (activeEntry ? 1 : 0);
      return activeEntry ? [activeEntry, ...rest.slice(0, limit)] : rest.slice(0, VIBE_TAG_CLOUD_COLLAPSED_LIMIT);
    }
    return entries.slice(0, VIBE_TAG_CLOUD_COLLAPSED_LIMIT);
  }, [vibeTagCounts, isVibeCloudExpanded, activeVibeTag]);

  const hiddenVibeCloudCount = useMemo(() => {
    const total = Object.keys(vibeTagCounts).length;
    if (isVibeCloudExpanded || total <= VIBE_TAG_CLOUD_COLLAPSED_LIMIT) return 0;
    return total - visibleVibeCloudEntries.length;
  }, [vibeTagCounts, isVibeCloudExpanded, visibleVibeCloudEntries.length]);

  return (
    <section
      className={`movie-reviews-section ${isExpanded ? 'movie-reviews-section--expanded' : 'movie-reviews-section--collapsed'}`}
      aria-labelledby="movie-reviews-heading"
    >
      <div className="movie-reviews-inner">
        {!isExpanded ? (
          <button
            type="button"
            className="movie-reviews-collapsed-trigger"
            onClick={() => setExpanded(true)}
            aria-expanded="false"
            aria-controls="movie-reviews-panel"
          >
            <div className="movie-reviews-collapsed-main">
              <div className="movie-reviews-collapsed-text">
                <p className="movie-reviews-eyebrow">
                  <Sparkles size={12} aria-hidden="true" />
                  Khán giả NASA
                </p>
                <h2 id="movie-reviews-heading" className="movie-reviews-title movie-reviews-title--compact">
                  Đánh giá &amp; bình luận
                </h2>
                <p className="movie-reviews-collapsed-summary">
                  {isSummaryLoading ? (
                    <span className="movie-reviews-collapsed-loading">
                      <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                      Đang tải...
                    </span>
                  ) : (
                    collapsedSummary
                  )}
                </p>
              </div>
              <ChevronDown size={20} className="movie-reviews-collapsed-chevron" aria-hidden="true" />
            </div>
            {hasReviews && !isSummaryLoading && (
              <div className="movie-reviews-collapsed-preview">
                <Star className="movie-reviews-collapsed-star" aria-hidden="true" />
                <span className="movie-reviews-collapsed-score">{averageDisplay}</span>
                <StarRating
                  value={Math.round(summary.averageRating)}
                  readOnly
                  size={13}
                  tone="red"
                  className="movie-reviews-collapsed-stars"
                />
              </div>
            )}
          </button>
        ) : (
          <>
            <header className="movie-reviews-header">
              <div className="movie-reviews-header-text">
                <p className="movie-reviews-eyebrow">
                  <Sparkles size={12} aria-hidden="true" />
                  Khán giả NASA
                </p>
                <h2 id="movie-reviews-heading" className="movie-reviews-title">
                  Đánh giá &amp; bình luận
                </h2>
                {movieTitle && (
                  <p className="movie-reviews-subtitle">
                    Chia sẻ cảm nhận về <span>{movieTitle}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                className="movie-reviews-collapse-btn"
                onClick={handleCollapse}
                aria-expanded="true"
                aria-controls="movie-reviews-panel"
                aria-label="Thu gọn đánh giá"
                title="Thu gọn"
              >
                <ChevronUp size={20} aria-hidden="true" />
              </button>
            </header>

            <div id="movie-reviews-panel">
        {isReviewsLoading && !reviewsLoaded ? (
          <div className="movie-reviews-loading movie-reviews-glass-card">
            <Loader2 className="animate-spin" size={22} />
            <span>Đang tải đánh giá...</span>
          </div>
        ) : (
          <>
          <div className="movie-reviews-top-grid">
            <aside className="movie-reviews-sidebar movie-reviews-glass-card">
              <div className="movie-reviews-score-hero">
                <div className="movie-reviews-score-box">
                  <Star className="movie-reviews-score-icon" aria-hidden="true" />
                  <span className="movie-reviews-score-number">
                    {averageDisplay ?? '—'}
                  </span>
                </div>
                <div className="movie-reviews-score-meta">
                  <p className="movie-reviews-score-label">
                    {hasReviews ? 'Điểm trung bình' : 'Chưa có điểm'}
                  </p>
                  <p className="movie-reviews-score-count">
                    {hasReviews
                      ? `${summary.totalReviews} lượt đánh giá`
                      : 'Hãy là người đầu tiên chấm điểm'}
                  </p>
                  {hasReviews && (
                    <StarRating
                      value={Math.round(summary.averageRating)}
                      readOnly
                      size={16}
                      tone="red"
                      className="movie-reviews-score-stars"
                    />
                  )}
                </div>
              </div>

              <div className="movie-reviews-distribution">
                <h3 className="movie-reviews-block-title">Phân bố điểm</h3>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution[star] || 0;
                  const pct = hasReviews ? Math.round((count / summary.totalReviews) * 100) : 0;
                  return (
                    <div key={star} className="movie-reviews-bar-row">
                      <span className="movie-reviews-bar-label">{star}</span>
                      <div className="movie-reviews-bar-track" aria-hidden="true">
                        <div className="movie-reviews-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="movie-reviews-bar-count">
                        {hasReviews ? `${pct}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hasVibeTags && (
                <div className="movie-reviews-vibe-cloud">
                  <h3 className="movie-reviews-block-title">Vibe tag phổ biến</h3>
                  <div className="movie-reviews-vibe-tags">
                    {visibleVibeCloudEntries.map(([code, count]) => (
                      <button
                        key={code}
                        type="button"
                        className={`movie-reviews-vibe-chip${activeVibeTag === code ? ' is-active' : ''}`}
                        onClick={() =>
                          setActiveVibeTag((current) => (current === code ? '' : code))
                        }
                        aria-pressed={activeVibeTag === code}
                      >
                        {getVibeTagLabel(code, vibeTagCatalog)}
                        <span className="movie-reviews-vibe-chip-count">{count}</span>
                      </button>
                    ))}
                  </div>
                  {hiddenVibeCloudCount > 0 && (
                    <button
                      type="button"
                      className="movie-reviews-vibe-toggle"
                      onClick={() => setIsVibeCloudExpanded(true)}
                    >
                      Xem thêm {hiddenVibeCloudCount} tag
                    </button>
                  )}
                  {isVibeCloudExpanded && Object.keys(vibeTagCounts).length > VIBE_TAG_CLOUD_COLLAPSED_LIMIT && (
                    <button
                      type="button"
                      className="movie-reviews-vibe-toggle"
                      onClick={() => setIsVibeCloudExpanded(false)}
                    >
                      Thu gọn
                    </button>
                  )}
                  {activeVibeTag && (
                    <button
                      type="button"
                      className="movie-reviews-vibe-clear"
                      onClick={() => setActiveVibeTag('')}
                    >
                      Bỏ lọc tag
                    </button>
                  )}
                </div>
              )}
            </aside>

            <div className="movie-reviews-form-col">
              {!isAuthenticated ? (
                <div className="movie-reviews-login-banner movie-reviews-glass-card">
                  <div>
                    <p className="movie-reviews-login-title">Đăng nhập để đánh giá</p>
                    <p className="movie-reviews-login-desc">
                      Đăng nhập và mua vé rạp hoặc vé online để chia sẻ đánh giá về phim này.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { from: `/movie/${movieUuid}` } })}
                    className="movie-reviews-login-btn"
                  >
                    <LogIn size={16} />
                    Đăng nhập
                  </button>
                </div>
              ) : !canSubmitReview ? (
                <div className="movie-reviews-purchase-banner movie-reviews-glass-card">
                  <div>
                    <p className="movie-reviews-login-title">
                      {summary?.reviewCooldownActive ? 'Chờ gửi đánh giá tiếp' : 'Mua vé để được đánh giá'}
                    </p>
                    <p className="movie-reviews-login-desc">{eligibilityMessage}</p>
                  </div>
                  {!summary?.reviewCooldownActive && (
                  <div className="movie-reviews-purchase-actions">
                    {showTheaterCta && (
                      <a href="#select-showtimes" className="movie-reviews-purchase-btn movie-reviews-purchase-btn--theater">
                        <Ticket size={15} />
                        Đặt vé rạp
                      </a>
                    )}
                    {showOnlineCta && (
                      <button
                        type="button"
                        onClick={() => navigate(`/movie/${movieUuid}?from=online`)}
                        className="movie-reviews-purchase-btn movie-reviews-purchase-btn--online"
                      >
                        <Tv size={15} />
                        Mua vé online
                      </button>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                <form className="movie-reviews-form movie-reviews-glass-card" onSubmit={handleSubmit}>
                  <div className="movie-reviews-form-top">
                    <div className="movie-reviews-form-head">
                      <span className="movie-reviews-form-icon" aria-hidden="true">
                        <MessageSquare size={18} />
                      </span>
                      <div>
                        <h3 className="movie-reviews-form-title">
                          Viết đánh giá
                        </h3>
                        <p className="movie-reviews-form-hint">
                          Mỗi lần gửi sẽ tạo một đánh giá mới. Chỉ dành cho khách đã mua vé rạp hoặc vé online.
                        </p>
                      </div>
                    </div>

                    <div className="movie-reviews-rating-block">
                      <StarRating value={rating} onChange={setRating} size={22} tone="red" />
                      <span className={`movie-reviews-rating-label ${rating > 0 ? 'is-active' : ''}`}>
                        {RATING_LABELS[rating]}
                      </span>
                    </div>
                  </div>

                  <div className="movie-reviews-form-field">
                    <span className="movie-reviews-form-label">
                      Vibe tag <span className="movie-reviews-optional">(tối đa {MAX_VIBE_TAGS_PER_REVIEW})</span>
                    </span>
                    {showVibePickerSearch && (
                      <input
                        type="search"
                        className="movie-reviews-vibe-search"
                        placeholder="Tìm vibe tag..."
                        value={vibePickerSearch}
                        onChange={(e) => setVibePickerSearch(e.target.value)}
                        aria-label="Tìm vibe tag"
                      />
                    )}
                    <div className="movie-reviews-vibe-picker" role="group" aria-label="Chọn vibe tag">
                      {visiblePickerTags.length === 0 ? (
                        <p className="movie-reviews-vibe-empty">
                          {vibeTagCatalog.length === 0
                            ? 'Chưa có vibe tag trên hệ thống. Vui lòng thử lại sau.'
                            : 'Không tìm thấy vibe tag phù hợp.'}
                        </p>
                      ) : (
                        visiblePickerTags.map((tag) => {
                          const isSelected = selectedVibeTags.includes(tag.code);
                          return (
                            <button
                              key={tag.code}
                              type="button"
                              className={`movie-reviews-vibe-picker-chip${isSelected ? ' is-selected' : ''}`}
                              onClick={() => handleToggleVibeTag(tag.code)}
                              aria-pressed={isSelected}
                            >
                              {tag.hash}
                            </button>
                          );
                        })
                      )}
                    </div>
                    {hiddenPickerTagCount > 0 && (
                      <button
                        type="button"
                        className="movie-reviews-vibe-toggle"
                        onClick={() => setIsVibePickerExpanded(true)}
                      >
                        Xem thêm {hiddenPickerTagCount} tag
                      </button>
                    )}
                    {isVibePickerExpanded
                      && !vibePickerSearchActive
                      && vibeTagCatalog.length > VIBE_TAG_COLLAPSED_LIMIT && (
                      <button
                        type="button"
                        className="movie-reviews-vibe-toggle"
                        onClick={() => setIsVibePickerExpanded(false)}
                      >
                        Thu gọn
                      </button>
                    )}
                  </div>

                  <div className="movie-reviews-form-field">
                    <label className="movie-reviews-form-label" htmlFor="movie-review-comment">
                      Bình luận <span className="movie-reviews-optional">(tuỳ chọn)</span>
                    </label>
                    <textarea
                      id="movie-review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      placeholder="Nội dung phim thế nào? Diễn xuất, hình ảnh, âm thanh..."
                      className="movie-reviews-textarea"
                    />
                  </div>

                  <div className="movie-reviews-form-footer">
                    <span className="movie-reviews-char-count">{comment.length}/2000</span>
                    <button
                      type="submit"
                      disabled={isSubmitting || rating < 1}
                      className="movie-reviews-submit-btn"
                    >
                      {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div id="movie-reviews-list" className="movie-reviews-list">
            <div className="movie-reviews-list-toolbar">
              <div className="movie-reviews-list-head-main">
                <h3 className="movie-reviews-list-title">
                  Bình luận gần đây
                </h3>
                {hasReviews && (
                  <span className="movie-reviews-list-badge">{summary.totalReviews}</span>
                )}
              </div>
              <div className="movie-reviews-list-controls">
                <div className="movie-reviews-sort-menu">
                  <button
                    type="button"
                    className="movie-reviews-sort-trigger"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsSortMenuOpen((open) => !open);
                    }}
                    aria-expanded={isSortMenuOpen}
                    aria-haspopup="listbox"
                    aria-label="Sắp xếp bình luận"
                  >
                    {activeSortLabel}
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  {isSortMenuOpen && (
                    <div
                      className="movie-reviews-sort-dropdown"
                      role="listbox"
                      aria-label="Sắp xếp bình luận"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {REVIEW_SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={reviewSort === option.value}
                          className={`movie-reviews-sort-option${reviewSort === option.value ? ' is-active' : ''}`}
                          onClick={() => {
                            setReviewSort(option.value);
                            setIsSortMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {totalItems > 0 && (
                  <span className="movie-reviews-list-count">{totalItems} bình luận</span>
                )}
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="movie-reviews-empty movie-reviews-glass-card">
                <div className="movie-reviews-empty-icon-wrap" aria-hidden="true">
                  <Star />
                </div>
                <p className="movie-reviews-empty-title">Chưa có bình luận nào</p>
                <p className="movie-reviews-empty-desc">
                  {isAuthenticated
                    ? canSubmitReview
                      ? 'Chọn số sao và gửi cảm nhận đầu tiên về bộ phim này.'
                      : 'Mua vé rạp hoặc vé online để trở thành người đầu tiên đánh giá.'
                    : 'Đăng nhập và mua vé để trở thành người đầu tiên đánh giá phim.'}
                </p>
              </div>
            ) : (
              <div className={`movie-reviews-items-wrap${isPageLoading ? ' is-loading' : ''}`}>
              <ul className="movie-reviews-items">
                {reviews.map((review) => (
                  <li key={review.uuid} className="movie-reviews-item movie-reviews-glass-card">
                    <div className="movie-reviews-item-head">
                      <div className="movie-reviews-item-user">
                        <UserAvatar
                          src={review.userAvatarUrl}
                          name={review.userFullName}
                          className="movie-reviews-item-avatar"
                        />
                        <div className="movie-reviews-item-profile">
                          <div className="movie-reviews-item-name">
                            <span className="movie-reviews-item-name-text">
                              {review.userFullName || 'Khán giả NASA'}
                            </span>
                            {review.mine ? (
                              <span className="movie-reviews-mine-badge">Bạn</span>
                            ) : (
                              <span className="movie-reviews-member-badge">Member</span>
                            )}
                          </div>
                          <p className="movie-reviews-item-date">
                            {formatReviewDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="movie-reviews-item-rating">
                        <span className="movie-reviews-item-rating-value">
                          {Number(review.rating).toFixed(1)}
                        </span>
                        <StarRating value={review.rating} readOnly size={14} tone="red" />
                        {review.mine ? (
                          <button
                            type="button"
                            className="movie-reviews-item-action-btn"
                            onClick={() => handleDeleteReview(review.uuid)}
                            disabled={isSubmitting}
                            title="Xóa đánh giá của bạn"
                            aria-label="Xóa đánh giá của bạn"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : isAuthenticated && !review.reportedByMe ? (
                          <button
                            type="button"
                            className="movie-reviews-item-action-btn"
                            onClick={() => handleReportReview(review)}
                            disabled={reportingId === review.uuid}
                            title="Báo cáo đánh giá"
                            aria-label="Báo cáo đánh giá"
                          >
                            <Flag size={16} />
                          </button>
                        ) : review.reportedByMe ? (
                          <span className="movie-reviews-reported-badge" title="Bạn đã báo cáo đánh giá này">
                            Đã báo cáo
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {(review.vibeTags || []).length > 0 && (
                      <div className="movie-reviews-item-tags">
                        {review.vibeTags.map((code) => (
                          <span key={`${review.uuid}-${code}`} className="movie-reviews-item-tag">
                            {getVibeTagLabel(code, vibeTagCatalog)}
                          </span>
                        ))}
                      </div>
                    )}
                    {review.comment ? (
                      <p className="movie-reviews-item-comment">{review.comment}</p>
                    ) : (
                      <p className="movie-reviews-item-comment movie-reviews-item-comment--muted">
                        Không có bình luận văn bản.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              </div>
            )}

            {totalItems > 0 && (
              <MovieReviewPagination
                currentPage={page + 1}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                isLoading={isPageLoading}
              />
            )}
          </div>
          </>
        )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default MovieReviewsSection;

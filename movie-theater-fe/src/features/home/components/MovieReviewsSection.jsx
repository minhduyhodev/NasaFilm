import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import UserAvatar from '../../../shared/components/UserAvatar';
import MovieReviewPagination from './MovieReviewPagination';
import StarRating from './StarRating';
import Swal from 'sweetalert2';
import './MovieReviewsSection.css';

const DEFAULT_REVIEWS_PER_PAGE = 10;

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
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

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

  const loadSummary = useCallback(async () => {
    const data = await movieReviewService.getSummary(movieUuid);
    setSummary(data);
    return data;
  }, [movieUuid]);

  const loadReviews = useCallback(async (pageNumber = 0, pageSize = itemsPerPage) => {
    const data = await movieReviewService.getReviews(movieUuid, pageNumber, pageSize);
    const content = data?.content || [];
    setReviews(content);
    setPage(data?.number ?? pageNumber);
    setTotalItems(data?.totalElements ?? 0);
    return data;
  }, [movieUuid, itemsPerPage]);

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
      await movieReviewService.createReview(movieUuid, { rating, comment });
      notificationService.success('Đã gửi đánh giá mới.');
      await refreshAll();
      setRating(0);
      setComment('');
    } catch (error) {
      notificationService.error(error.message || 'Không thể gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewUuid) => {
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
    } catch (error) {
      notificationService.error(error.message || 'Không thể gửi báo cáo.');
    } finally {
      setReportingId(null);
    }
  };

  const distribution = summary?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const maxDistribution = Math.max(...Object.values(distribution), 1);
  const hasReviews = (summary?.totalReviews ?? 0) > 0;
  const averageDisplay = hasReviews ? summary.averageRating.toFixed(1) : null;
  const canSubmitReview = summary?.canReview ?? false;
  const eligibilityMessage =
    summary?.reviewEligibilityMessage ||
    'Chỉ khách hàng đã mua vé chiếu rạp hoặc vé xem online mới có thể đánh giá phim này.';

  const collapsedSummary = hasReviews
    ? `${averageDisplay} điểm · ${summary.totalReviews} đánh giá`
    : 'Chưa có đánh giá — nhấn để xem và viết đánh giá';

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
          <div className="movie-reviews-loading glass-panel">
            <Loader2 className="animate-spin" size={22} />
            <span>Đang tải đánh giá...</span>
          </div>
        ) : (
          <div className="movie-reviews-body">
            <aside className="movie-reviews-sidebar glass-panel">
              <div className="movie-reviews-score-hero">
                <div className="movie-reviews-score-ring">
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
                      size={14}
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
                  const barWidth = hasReviews
                    ? `${Math.round((count / maxDistribution) * 100)}%`
                    : '0%';
                  return (
                    <div key={star} className="movie-reviews-bar-row">
                      <span className="movie-reviews-bar-label">{star}</span>
                      <div className="movie-reviews-bar-track" aria-hidden="true">
                        <div className="movie-reviews-bar-fill" style={{ width: barWidth }} />
                      </div>
                      <span className="movie-reviews-bar-count">
                        {hasReviews ? `${pct}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="movie-reviews-content">
              {!isAuthenticated ? (
                <div className="movie-reviews-login-banner glass-panel">
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
                <div className="movie-reviews-purchase-banner glass-panel">
                  <div>
                    <p className="movie-reviews-login-title">Mua vé để được đánh giá</p>
                    <p className="movie-reviews-login-desc">{eligibilityMessage}</p>
                  </div>
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
                </div>
              ) : (
                <form className="movie-reviews-form glass-panel" onSubmit={handleSubmit}>
                  <div className="movie-reviews-form-top">
                    <div className="movie-reviews-form-head">
                      <span className="movie-reviews-form-icon" aria-hidden="true">
                        <MessageSquare size={18} />
                      </span>
                      <div>
                        <h3 className="movie-reviews-block-title movie-reviews-block-title--flush">
                          Viết đánh giá
                        </h3>
                        <p className="movie-reviews-form-hint">
                          Mỗi lần gửi sẽ tạo một đánh giá mới. Chỉ dành cho khách đã mua vé rạp hoặc vé online.
                        </p>
                      </div>
                    </div>

                    <div className="movie-reviews-rating-block">
                      <StarRating value={rating} onChange={setRating} size={32} />
                      <span className={`movie-reviews-rating-label ${rating > 0 ? 'is-active' : ''}`}>
                        {RATING_LABELS[rating]}
                      </span>
                    </div>
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
                      rows={3}
                      placeholder="Nội dung phim thế nào? Diễn xuất, hình ảnh, âm thanh..."
                      className="movie-reviews-textarea"
                    />
                  </div>

                  <div className="movie-reviews-form-footer">
                    <span className="movie-reviews-char-count">{comment.length}/2000</span>
                    <div className="movie-reviews-form-actions">
                      <button
                        type="submit"
                        disabled={isSubmitting || rating < 1}
                        className="movie-reviews-submit-btn"
                      >
                        {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div id="movie-reviews-list" className="movie-reviews-list">
                <div className="movie-reviews-list-head">
                  <div className="movie-reviews-list-head-main">
                    <h3 className="movie-reviews-block-title movie-reviews-block-title--flush">
                      Bình luận gần đây
                    </h3>
                    {hasReviews && (
                      <span className="movie-reviews-list-badge">{summary.totalReviews}</span>
                    )}
                  </div>
                  <MovieReviewPagination
                    compact
                    currentPage={page + 1}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    isLoading={isPageLoading}
                  />
                </div>

                {reviews.length === 0 ? (
                  <div className="movie-reviews-empty glass-panel">
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
                      <li key={review.uuid} className="movie-reviews-item glass-panel">
                        <div className="movie-reviews-item-head">
                          <div className="movie-reviews-item-user">
                            <UserAvatar
                              src={review.userAvatarUrl}
                              name={review.userFullName}
                              className="w-10 h-10"
                            />
                            <div>
                              <p className="movie-reviews-item-name">
                                {review.userFullName || 'Khán giả NASA'}
                                {review.mine && (
                                  <span className="movie-reviews-mine-badge">Bạn</span>
                                )}
                              </p>
                              <p className="movie-reviews-item-date">
                                {formatReviewDate(review.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="movie-reviews-item-rating">
                            <span className="movie-reviews-item-rating-value">
                              {review.rating}.0
                            </span>
                            <StarRating value={review.rating} readOnly size={13} />
                            {!review.mine && isAuthenticated && !review.reportedByMe && (
                              <button
                                type="button"
                                className="movie-reviews-report-btn"
                                onClick={() => handleReportReview(review)}
                                disabled={reportingId === review.uuid}
                                title="Báo cáo đánh giá"
                                aria-label="Báo cáo đánh giá"
                              >
                                <Flag size={14} />
                              </button>
                            )}
                            {!review.mine && isAuthenticated && review.reportedByMe && (
                              <span className="movie-reviews-reported-badge" title="Bạn đã báo cáo đánh giá này">
                                Đã báo cáo
                              </span>
                            )}
                            {review.mine && (
                              <button
                                type="button"
                                className="movie-reviews-item-delete-btn"
                                onClick={() => handleDeleteReview(review.uuid)}
                                disabled={isSubmitting}
                                title="Xóa đánh giá của bạn"
                                aria-label="Xóa đánh giá của bạn"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
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
            </div>
          </div>
        )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default MovieReviewsSection;

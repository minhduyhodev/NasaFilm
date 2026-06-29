import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Star,
  Trash2,
} from 'lucide-react';
import { adminReviewService } from '../../../shared/services/adminReviewService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import { AdminPage, PageHeader, PrimaryButton, DangerButton, GhostButton } from '../components';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './FeedbackReviewsPage.css';

const REVIEWS_PER_PAGE = 10;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reportStatusClass(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PENDING') return 'feedback-status feedback-status--pending';
  if (normalized === 'RESOLVED') return 'feedback-status feedback-status--resolved';
  return 'feedback-status feedback-status--rejected';
}

function reviewStatusClass(status) {
  const normalized = (status || '').toUpperCase();
  return normalized === 'HIDDEN'
    ? 'feedback-status feedback-status--hidden'
    : 'feedback-status feedback-status--visible';
}

const FeedbackReviewsPage = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('reports');
  const [reportListTab, setReportListTab] = useState('pending');

  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState(0);
  const [reportTotal, setReportTotal] = useState(0);
  const [isReportsLoading, setIsReportsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [reviewQuery, setReviewQuery] = useState('');
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [actionReviewId, setActionReviewId] = useState(null);

  const [bannedWords, setBannedWords] = useState([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [isBannedWordsLoading, setIsBannedWordsLoading] = useState(false);
  const [isSavingBannedWords, setIsSavingBannedWords] = useState(false);

  const loadReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const status = reportListTab === 'pending' ? 'PENDING' : undefined;
      const excludeStatus = reportListTab === 'history' ? 'PENDING' : undefined;
      const data = await adminReviewService.getReports({
        status,
        excludeStatus,
        page: reportPage,
        size: REVIEWS_PER_PAGE,
      });
      setReports(data?.content || []);
      setReportTotal(data?.totalElements ?? 0);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải danh sách báo cáo.');
      setReports([]);
      setReportTotal(0);
    } finally {
      setIsReportsLoading(false);
    }
  }, [reportListTab, reportPage]);

  const loadReviews = useCallback(async () => {
    setIsReviewsLoading(true);
    try {
      const data = await adminReviewService.getReviews({
        status: reviewStatusFilter || undefined,
        query: reviewQuery || undefined,
        page: reviewPage,
        size: REVIEWS_PER_PAGE,
      });
      setReviews(data?.content || []);
      setReviewTotal(data?.totalElements ?? 0);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải danh sách đánh giá.');
      setReviews([]);
      setReviewTotal(0);
    } finally {
      setIsReviewsLoading(false);
    }
  }, [reviewPage, reviewQuery, reviewStatusFilter]);

  const loadBannedWords = useCallback(async () => {
    setIsBannedWordsLoading(true);
    try {
      const words = await adminReviewService.getBannedWords();
      setBannedWords(Array.isArray(words) ? words : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải danh sách từ cấm.');
      setBannedWords([]);
    } finally {
      setIsBannedWordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab, loadReviews]);

  useEffect(() => {
    if (activeTab === 'banned-words') {
      loadBannedWords();
    }
  }, [activeTab, loadBannedWords]);

  useEffect(() => {
    setReportPage(0);
  }, [reportListTab]);

  const handleResolveReport = async (reportUuid, action) => {
    setResolvingId(reportUuid);
    try {
      await adminReviewService.resolveReport(reportUuid, { action });
      notificationService.success(action === 'HIDE_REVIEW' ? 'Đã ẩn đánh giá.' : 'Đã bác báo cáo.');
      await loadReports();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xử lý báo cáo.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleReviewStatus = async (reviewUuid, status) => {
    setActionReviewId(reviewUuid);
    try {
      await adminReviewService.updateReviewStatus(reviewUuid, { status });
      notificationService.success(status === 'HIDDEN' ? 'Đã ẩn đánh giá.' : 'Đã hiện đánh giá.');
      await loadReviews();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể cập nhật đánh giá.');
    } finally {
      setActionReviewId(null);
    }
  };

  const handleDeleteReview = async (reviewUuid) => {
    const ok = await confirm({
      title: 'Xóa đánh giá',
      message: 'Bạn có chắc muốn xóa vĩnh viễn đánh giá này?',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;

    setActionReviewId(reviewUuid);
    try {
      await adminReviewService.deleteReview(reviewUuid);
      notificationService.success('Đã xóa đánh giá.');
      await loadReviews();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xóa đánh giá.');
    } finally {
      setActionReviewId(null);
    }
  };

  const handleAddBannedWord = () => {
    const word = newBannedWord.trim().toLowerCase();
    if (!word) return;
    if (bannedWords.includes(word)) {
      notificationService.warning('Từ này đã có trong danh sách.');
      return;
    }
    setBannedWords((prev) => [...prev, word].sort((a, b) => a.localeCompare(b, 'vi')));
    setNewBannedWord('');
  };

  const handleToggleBannedWord = (word) => {
    setBannedWords((prev) => prev.filter((item) => item !== word));
  };

  const handleSaveBannedWords = async () => {
    setIsSavingBannedWords(true);
    try {
      const saved = await adminReviewService.updateBannedWords(bannedWords);
      setBannedWords(Array.isArray(saved) ? saved : []);
      notificationService.success('Đã lưu danh sách từ cấm.');
    } catch (err) {
      notificationService.error(err?.message || 'Không thể lưu danh sách từ cấm.');
    } finally {
      setIsSavingBannedWords(false);
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === 'reports') loadReports();
    else if (activeTab === 'reviews') loadReviews();
    else loadBannedWords();
  };

  const isLoading =
    (activeTab === 'reports' && isReportsLoading) ||
    (activeTab === 'reviews' && isReviewsLoading) ||
    (activeTab === 'banned-words' && isBannedWordsLoading);

  return (
    <AdminPage>
      <PageHeader
        title="Kiểm duyệt đánh giá phim"
        description="Xử lý báo cáo từ khán giả, quản lý đánh giá và cấu hình từ cấm cho bình luận."
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: refreshCurrentTab,
            disabled: isLoading,
            icon: <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
          },
        ]}
      />

      <div className="feedback-tabs">
        <button
          type="button"
          className={`feedback-tab${activeTab === 'reports' ? ' feedback-tab--active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Đơn báo cáo
        </button>
        <button
          type="button"
          className={`feedback-tab${activeTab === 'reviews' ? ' feedback-tab--active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Quản lý đánh giá
        </button>
        <button
          type="button"
          className={`feedback-tab${activeTab === 'banned-words' ? ' feedback-tab--active' : ''}`}
          onClick={() => setActiveTab('banned-words')}
        >
          Từ cấm
        </button>
      </div>

      {activeTab === 'reports' && (
        <>
          <div className="feedback-subtabs">
            <button
              type="button"
              className={`feedback-subtab${reportListTab === 'pending' ? ' feedback-subtab--active' : ''}`}
              onClick={() => setReportListTab('pending')}
            >
              Chờ xử lý
            </button>
            <button
              type="button"
              className={`feedback-subtab${reportListTab === 'history' ? ' feedback-subtab--active' : ''}`}
              onClick={() => setReportListTab('history')}
            >
              Đã xử lý
            </button>
          </div>

          {isReportsLoading ? (
            <div className="feedback-state">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
              <p>Đang tải đơn báo cáo...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="feedback-state">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p>
                {reportListTab === 'pending'
                  ? 'Không có đơn báo cáo nào đang chờ xử lý.'
                  : 'Chưa có lịch sử xử lý báo cáo.'}
              </p>
            </div>
          ) : (
            <div className="feedback-table-wrap">
              <table className="feedback-table">
                <thead>
                  <tr>
                    <th>Người báo cáo</th>
                    <th>Phim</th>
                    <th>Đánh giá bị báo cáo</th>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    {reportListTab === 'pending' && <th />}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((item) => (
                    <tr key={item.uuid}>
                      <td>{item.reporterFullName || '—'}</td>
                      <td>{item.movieTitle || '—'}</td>
                      <td className="feedback-review-cell">
                        <div className="feedback-review-rating">
                          <Star className="h-3.5 w-3.5 text-amber-400" />
                          {item.reviewRating}.0 · {item.reviewUserFullName || 'Khán giả'}
                        </div>
                        <p className="feedback-review-comment" title={item.reviewComment}>
                          {item.reviewComment || 'Không có bình luận'}
                        </p>
                      </td>
                      <td className="feedback-reason-cell" title={item.reason}>
                        {item.reason}
                      </td>
                      <td>
                        <span className={reportStatusClass(item.status)}>{item.status}</span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      {reportListTab === 'pending' && (
                        <td className="feedback-actions-cell">
                          <PrimaryButton
                            type="button"
                            disabled={resolvingId === item.uuid}
                            onClick={() => handleResolveReport(item.uuid, 'HIDE_REVIEW')}
                          >
                            {resolvingId === item.uuid ? 'Đang xử lý...' : 'Ẩn đánh giá'}
                          </PrimaryButton>
                          <GhostButton
                            type="button"
                            disabled={resolvingId === item.uuid}
                            onClick={() => handleResolveReport(item.uuid, 'DISMISS')}
                          >
                            Bác báo cáo
                          </GhostButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportTotal > 0 && (
            <Pagination
              currentPage={reportPage + 1}
              totalItems={reportTotal}
              itemsPerPage={REVIEWS_PER_PAGE}
              onPageChange={(page) => setReportPage(page - 1)}
            />
          )}
        </>
      )}

      {activeTab === 'reviews' && (
        <>
          <div className="feedback-filters">
            <input
              type="search"
              className="feedback-search"
              placeholder="Tìm theo nội dung bình luận..."
              value={reviewQuery}
              onChange={(e) => {
                setReviewQuery(e.target.value);
                setReviewPage(0);
              }}
            />
            <select
              className="feedback-select"
              value={reviewStatusFilter}
              onChange={(e) => {
                setReviewStatusFilter(e.target.value);
                setReviewPage(0);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="VISIBLE">Đang hiển thị</option>
              <option value="HIDDEN">Đã ẩn</option>
            </select>
          </div>

          {isReviewsLoading ? (
            <div className="feedback-state">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
              <p>Đang tải danh sách đánh giá...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="feedback-state">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
              <p>Không tìm thấy đánh giá phù hợp.</p>
            </div>
          ) : (
            <div className="feedback-table-wrap">
              <table className="feedback-table">
                <thead>
                  <tr>
                    <th>Phim</th>
                    <th>Khách hàng</th>
                    <th>Sao</th>
                    <th>Bình luận</th>
                    <th>Báo cáo</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((item) => (
                    <tr key={item.uuid}>
                      <td>{item.movieTitle || '—'}</td>
                      <td>{item.userFullName || '—'}</td>
                      <td className="feedback-rating-cell">{item.rating}.0</td>
                      <td className="feedback-reason-cell" title={item.comment}>
                        {item.comment || '—'}
                      </td>
                      <td>{item.reportCount ?? 0}</td>
                      <td>
                        <span className={reviewStatusClass(item.status)}>{item.status}</span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td className="feedback-actions-cell">
                        {item.status === 'HIDDEN' ? (
                          <GhostButton
                            type="button"
                            disabled={actionReviewId === item.uuid}
                            onClick={() => handleReviewStatus(item.uuid, 'VISIBLE')}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Hiện
                          </GhostButton>
                        ) : (
                          <GhostButton
                            type="button"
                            disabled={actionReviewId === item.uuid}
                            onClick={() => handleReviewStatus(item.uuid, 'HIDDEN')}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Ẩn
                          </GhostButton>
                        )}
                        <DangerButton
                          type="button"
                          disabled={actionReviewId === item.uuid}
                          onClick={() => handleDeleteReview(item.uuid)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </DangerButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reviewTotal > 0 && (
            <Pagination
              currentPage={reviewPage + 1}
              totalItems={reviewTotal}
              itemsPerPage={REVIEWS_PER_PAGE}
              onPageChange={(page) => setReviewPage(page - 1)}
            />
          )}
        </>
      )}

      {activeTab === 'banned-words' && (
        <div className="feedback-banned-panel">
          <div className="feedback-banned-head">
            <div>
              <h3 className="feedback-banned-title">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                Checklist từ cấm
              </h3>
              <p className="feedback-banned-desc">
                Bình luận chứa các từ trong danh sách sẽ bị chặn khi khách gửi đánh giá.
              </p>
            </div>
            <PrimaryButton
              type="button"
              onClick={handleSaveBannedWords}
              disabled={isSavingBannedWords}
            >
              {isSavingBannedWords ? 'Đang lưu...' : 'Lưu danh sách'}
            </PrimaryButton>
          </div>

          <div className="feedback-banned-add">
            <input
              type="text"
              className="feedback-search"
              placeholder="Thêm từ cấm mới..."
              value={newBannedWord}
              onChange={(e) => setNewBannedWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBannedWord();
                }
              }}
            />
            <GhostButton type="button" onClick={handleAddBannedWord}>
              <Plus className="h-4 w-4" />
              Thêm
            </GhostButton>
          </div>

          {isBannedWordsLoading ? (
            <div className="feedback-state">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
              <p>Đang tải danh sách từ cấm...</p>
            </div>
          ) : bannedWords.length === 0 ? (
            <div className="feedback-state">
              <ShieldAlert className="h-10 w-10 text-amber-400" />
              <p>Chưa có từ cấm nào. Thêm từ để bắt đầu lọc bình luận.</p>
            </div>
          ) : (
            <ul className="feedback-banned-list">
              {bannedWords.map((word) => (
                <li key={word} className="feedback-banned-item">
                  <label className="feedback-banned-check">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => handleToggleBannedWord(word)}
                    />
                    <span>{word}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AdminPage>
  );
};

export default FeedbackReviewsPage;

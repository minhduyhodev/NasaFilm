import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { adminReviewService } from '../../../shared/services/adminReviewService';
import { notificationService } from '../../../shared/services/notificationService';
import { getVibeTagLabel, loadReviewVibeTags, clearReviewVibeTagsCache } from '../../../shared/constants/reviewVibeTags';
import Pagination from '../../../shared/components/Pagination';
import TabTransition from '../../../shared/components/TabTransition';
import { AdminPage, PageHeader, PrimaryButton, GhostButton, FilterPills, StatusBadge, AdminTableShell } from '../components';
import AdminModal from '../components/AdminModal';
import { adminInputClass, adminLabelClass } from '../components/adminFormStyles';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import Swal from 'sweetalert2';
import './FeedbackReviewsPage.css';

const REPORTS_PER_PAGE = 10;

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

function reportStatusLabel(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PENDING') return 'Chờ xử lý';
  if (normalized === 'RESOLVED') return 'Đã ẩn đánh giá';
  if (normalized === 'REJECTED') return 'Đã bác báo cáo';
  return status || '—';
}

function notifyReportsChanged() {
  window.dispatchEvent(new CustomEvent('admin-review-reports-changed'));
}

function reportStatusVariant(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PENDING') return 'warning';
  if (normalized === 'RESOLVED') return 'success';
  return 'muted';
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

  const [bannedWords, setBannedWords] = useState([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [isBannedWordsLoading, setIsBannedWordsLoading] = useState(false);
  const [isSavingBannedWords, setIsSavingBannedWords] = useState(false);
  const [vibeTagCatalog, setVibeTagCatalog] = useState([]);
  const [adminVibeTags, setAdminVibeTags] = useState([]);
  const [isVibeTagsLoading, setIsVibeTagsLoading] = useState(false);
  const [isSavingVibeTag, setIsSavingVibeTag] = useState(false);
  const [isCreateVibeTagModalOpen, setIsCreateVibeTagModalOpen] = useState(false);
  const [newVibeTag, setNewVibeTag] = useState({
    code: '',
    label: '',
    hash: '',
  });

  useEffect(() => {
    loadReviewVibeTags()
      .then((tags) => setVibeTagCatalog(tags))
      .catch(() => setVibeTagCatalog([]));
  }, []);

  const loadAdminVibeTags = useCallback(async () => {
    setIsVibeTagsLoading(true);
    try {
      const tags = await adminReviewService.getVibeTags();
      setAdminVibeTags(Array.isArray(tags) ? tags : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải danh sách vibe tag.');
      setAdminVibeTags([]);
    } finally {
      setIsVibeTagsLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const status = reportListTab === 'pending' ? 'PENDING' : undefined;
      const excludeStatus = reportListTab === 'history' ? 'PENDING' : undefined;
      const data = await adminReviewService.getReports({
        status,
        excludeStatus,
        page: reportPage,
        size: REPORTS_PER_PAGE,
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
    if (activeTab === 'banned-words') {
      loadBannedWords();
    }
  }, [activeTab, loadBannedWords]);

  useEffect(() => {
    if (activeTab === 'vibe-tags') {
      loadAdminVibeTags();
    }
  }, [activeTab, loadAdminVibeTags]);

  useRealtimeTopic(
    activeTab === 'reports' ? REALTIME_TOPICS.ADMIN_REVIEW_REPORTS : null,
    loadReports,
  );

  const handleReportListTabChange = (tab) => {
    setReportListTab(tab);
    setReportPage(0);
  };

  const handleResolveReport = async (reportUuid, action) => {
    const isHide = action === 'HIDE_REVIEW';
    let note;

    if (isHide) {
      const result = await Swal.fire({
        title: 'Ẩn đánh giá',
        input: 'textarea',
        inputLabel: 'Ghi chú nội bộ (tuỳ chọn)',
        inputPlaceholder: 'Lý do ẩn đánh giá...',
        inputAttributes: { maxlength: 1000 },
        showCancelButton: true,
        confirmButtonText: 'Ẩn đánh giá',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#334155',
        background: '#0f1322',
        color: '#f1f5f9',
      });
      if (!result.isConfirmed) return;
      note = result.value?.trim() || undefined;
    } else {
      const ok = await confirm({
        title: 'Bác báo cáo',
        message: 'Báo cáo sẽ được đánh dấu đã xử lý và đánh giá vẫn hiển thị. Tiếp tục?',
        confirmLabel: 'Bác báo cáo',
        variant: 'default',
      });
      if (!ok) return;
    }

    setResolvingId(reportUuid);
    try {
      await adminReviewService.resolveReport(reportUuid, { action, note });
      notificationService.success(isHide ? 'Đã ẩn đánh giá.' : 'Đã bác báo cáo.');
      notifyReportsChanged();
      await loadReports();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xử lý báo cáo.');
    } finally {
      setResolvingId(null);
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
    const ok = await confirm({
      title: 'Lưu danh sách từ cấm',
      message: 'Xác nhận cập nhật danh sách từ cấm? Các đánh giá chứa từ này sẽ bị lọc tự động.',
      highlight: `${bannedWords.length} từ cấm`,
      confirmLabel: 'Lưu danh sách',
      variant: 'warning',
    });
    if (!ok) return;

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

  const handleCreateVibeTag = async () => {
    const code = newVibeTag.code.trim().toLowerCase();
    const label = newVibeTag.label.trim();
    const hash = newVibeTag.hash.trim();
    if (!code || !label || !hash) {
      notificationService.warning('Vui lòng nhập đủ mã, nhãn và hash.');
      return;
    }
    setIsSavingVibeTag(true);
    try {
      await adminReviewService.createVibeTag({ code, label, hash });
      clearReviewVibeTagsCache();
      setNewVibeTag({ code: '', label: '', hash: '' });
      setIsCreateVibeTagModalOpen(false);
      notificationService.success('Đã thêm vibe tag.');
      await loadAdminVibeTags();
      const tags = await loadReviewVibeTags();
      setVibeTagCatalog(tags);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể thêm vibe tag.');
    } finally {
      setIsSavingVibeTag(false);
    }
  };

  const handleCloseCreateVibeTagModal = () => {
    if (isSavingVibeTag) return;
    setIsCreateVibeTagModalOpen(false);
    setNewVibeTag({ code: '', label: '', hash: '' });
  };

  const handleUpdateVibeTag = async (tag) => {
    setIsSavingVibeTag(true);
    try {
      await adminReviewService.updateVibeTag(tag.uuid, {
        label: tag.label,
        hash: tag.hash,
        active: tag.active,
      });
      clearReviewVibeTagsCache();
      notificationService.success('Đã cập nhật vibe tag.');
      await loadAdminVibeTags();
      const tags = await loadReviewVibeTags();
      setVibeTagCatalog(tags);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể cập nhật vibe tag.');
    } finally {
      setIsSavingVibeTag(false);
    }
  };

  const handleAdminVibeTagFieldChange = (uuid, field, value) => {
    setAdminVibeTags((prev) =>
      prev.map((item) => (item.uuid === uuid ? { ...item, [field]: value } : item)),
    );
  };

  const refreshCurrentTab = () => {
    if (activeTab === 'reports') loadReports();
    else if (activeTab === 'banned-words') loadBannedWords();
    else loadAdminVibeTags();
  };

  const isLoading =
    (activeTab === 'reports' && isReportsLoading) ||
    (activeTab === 'banned-words' && isBannedWordsLoading) ||
    (activeTab === 'vibe-tags' && isVibeTagsLoading);

  return (
    <AdminPage>
      <PageHeader
        title="Kiểm duyệt đánh giá phim"
        description="Xử lý báo cáo từ khán giả và cấu hình từ cấm cho bình luận."
      />

      <FilterPills
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'reports', label: 'Đơn báo cáo' },
          { id: 'banned-words', label: 'Từ cấm' },
          { id: 'vibe-tags', label: 'Vibe tag' },
        ]}
        ariaLabel="Tab kiểm duyệt"
        className="mb-4"
      />

      <TabTransition activeKey={activeTab}>
      {activeTab === 'reports' && (
        <>
          <FilterPills
            value={reportListTab}
            onChange={handleReportListTabChange}
            items={[
              { id: 'pending', label: 'Chờ xử lý' },
              { id: 'history', label: 'Đã xử lý' },
            ]}
            ariaLabel="Lọc đơn báo cáo"
            className="mb-4"
          />

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
            <AdminTableShell
              footer={
                reportTotal > 0 ? (
                  <Pagination
                    currentPage={reportPage + 1}
                    totalItems={reportTotal}
                    itemsPerPage={REPORTS_PER_PAGE}
                    onPageChange={(page) => setReportPage(page - 1)}
                  />
                ) : null
              }
            >
              <table className="adm-table feedback-table">
                <thead>
                  <tr>
                    <th>Người báo cáo</th>
                    <th>Phim</th>
                    <th>Đánh giá bị báo cáo</th>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    {reportListTab === 'history' && (
                      <>
                        <th>Người xử lý</th>
                        <th>Ngày xử lý</th>
                      </>
                    )}
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
                        {(item.reviewVibeTags || []).length > 0 && (
                          <div className="feedback-review-tags">
                            {item.reviewVibeTags.map((code) => (
                              <span key={`${item.uuid}-${code}`} className="feedback-review-tag">
                                {getVibeTagLabel(code, vibeTagCatalog)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="feedback-reason-cell" title={item.reason}>
                        {item.reason}
                      </td>
                      <td>
                        <StatusBadge variant={reportStatusVariant(item.status)}>
                          {reportStatusLabel(item.status)}
                        </StatusBadge>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      {reportListTab === 'history' && (
                        <>
                          <td>{item.resolvedByFullName || '—'}</td>
                          <td>{formatDate(item.resolvedAt)}</td>
                        </>
                      )}
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
            </AdminTableShell>
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

      {activeTab === 'vibe-tags' && (
        <div className="feedback-banned-panel">
          <div className="feedback-banned-head">
            <div>
              <h3 className="feedback-banned-title">Quản lý vibe tag</h3>
              <p className="feedback-banned-desc">
                Cấu hình thẻ cảm xúc khách chọn khi đánh giá phim. Thứ tự hiển thị ưu tiên theo số lượt dùng.
                Tag tắt sẽ không hiển thị khi viết review mới.
              </p>
            </div>
            <PrimaryButton type="button" onClick={() => setIsCreateVibeTagModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Thêm tag
            </PrimaryButton>
          </div>

          {isVibeTagsLoading ? (
            <div className="feedback-state">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
              <p>Đang tải vibe tag...</p>
            </div>
          ) : adminVibeTags.length === 0 ? (
            <div className="feedback-state">
              <p>Chưa có vibe tag nào.</p>
            </div>
          ) : (
            <div className="feedback-table-wrap">
              <table className="feedback-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Nhãn</th>
                    <th>Hash</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {adminVibeTags.map((tag) => (
                    <tr key={tag.uuid}>
                      <td><code>{tag.code}</code></td>
                      <td>
                        <input
                          type="text"
                          className="feedback-search"
                          value={tag.label}
                          onChange={(e) => handleAdminVibeTagFieldChange(tag.uuid, 'label', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="feedback-search"
                          value={tag.hash}
                          onChange={(e) => handleAdminVibeTagFieldChange(tag.uuid, 'hash', e.target.value)}
                        />
                      </td>
                      <td>
                        <label className="feedback-banned-check">
                          <input
                            type="checkbox"
                            checked={tag.active}
                            onChange={(e) => handleAdminVibeTagFieldChange(tag.uuid, 'active', e.target.checked)}
                          />
                          <span>{tag.active ? 'Bật' : 'Tắt'}</span>
                        </label>
                      </td>
                      <td>
                        <GhostButton
                          type="button"
                          disabled={isSavingVibeTag}
                          onClick={() => handleUpdateVibeTag(tag)}
                        >
                          Lưu
                        </GhostButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </TabTransition>

      <AdminModal
        open={isCreateVibeTagModalOpen}
        onClose={handleCloseCreateVibeTagModal}
        title="Thêm vibe tag"
        subtitle="Nhập thông tin thẻ cảm xúc mới cho khách chọn khi đánh giá phim."
        size="md"
      >
        <form
          className="feedback-vibe-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateVibeTag();
          }}
        >
          <div>
            <label className={adminLabelClass} htmlFor="vibe-tag-code">
              Mã tag *
            </label>
            <input
              id="vibe-tag-code"
              type="text"
              className={adminInputClass}
              placeholder="vd: cam_dong"
              value={newVibeTag.code}
              onChange={(e) => setNewVibeTag((prev) => ({ ...prev, code: e.target.value }))}
              autoFocus
            />
            <p className="feedback-vibe-field-hint">Chỉ dùng chữ thường, số và dấu gạch dưới.</p>
          </div>
          <div>
            <label className={adminLabelClass} htmlFor="vibe-tag-label">
              Nhãn hiển thị *
            </label>
            <input
              id="vibe-tag-label"
              type="text"
              className={adminInputClass}
              placeholder="vd: Cảm động"
              value={newVibeTag.label}
              onChange={(e) => setNewVibeTag((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div>
            <label className={adminLabelClass} htmlFor="vibe-tag-hash">
              Hash *
            </label>
            <input
              id="vibe-tag-hash"
              type="text"
              className={adminInputClass}
              placeholder="vd: #cảm_động"
              value={newVibeTag.hash}
              onChange={(e) => setNewVibeTag((prev) => ({ ...prev, hash: e.target.value }))}
            />
          </div>
          <div className="feedback-vibe-modal-actions">
            <GhostButton type="button" onClick={handleCloseCreateVibeTagModal} disabled={isSavingVibeTag}>
              Hủy
            </GhostButton>
            <PrimaryButton type="submit" disabled={isSavingVibeTag}>
              {isSavingVibeTag ? 'Đang lưu...' : 'Thêm tag'}
            </PrimaryButton>
          </div>
        </form>
      </AdminModal>
    </AdminPage>
  );
};

export default FeedbackReviewsPage;

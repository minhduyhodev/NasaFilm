import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  CalendarRange,
  Clapperboard,
  Compass,
  Copy,
  LayoutGrid,
  PenLine,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Rocket,
  Search,
  Sparkles,
  Target,
  Ticket,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { adminMissionService } from '../api/adminMissionService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import TabTransition from '../../../shared/components/TabTransition';
import AdminModal from '../components/AdminModal';
import MissionFormPanel from '../components/panels/MissionFormPanel';
import MissionCampaignFormPanel from '../components/panels/MissionCampaignFormPanel';
import { AdminPage, PageHeader, PrimaryButton, AdminKpiGrid, FilterPills, StatusBadge } from '../components';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import useDragScroll from '../../../shared/hooks/useDragScroll';
import {
  formatAdminDateRange,
  formatAdminDateTime,
  getCampaignStatusLabel,
  getCampaignCardTheme,
  getConditionLabel,
  getMissionCardTheme,
  getMissionDisplayTitle,
  getRecurrenceLabel,
  resolveCampaignTitle,
} from '../utils/missionAdminUtils';
import './MissionsPage.css';

const MISSION_THEME_ICONS = {
  compass: Compass,
  ticket: Ticket,
  clapperboard: Clapperboard,
  users: Users,
  pen: PenLine,
  sparkles: Sparkles,
  target: Target,
  rocket: Rocket,
};

const MissionCardCover = ({ theme, variant = 'mission' }) => {
  const Icon = MISSION_THEME_ICONS[theme.icon] || Target;
  return (
    <div
      className={`mc-card__media ${variant === 'campaign' ? 'mc-card__media--campaign' : ''}`}
      data-tone={theme.tone}
    >
      <div className="mc-card__cover" aria-hidden="true">
        <span className="mc-card__cover-orb mc-card__cover-orb--a" />
        <span className="mc-card__cover-orb mc-card__cover-orb--b" />
        <span className="mc-card__cover-icon">
          <Icon size={28} strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
};

const MissionStrip = ({ children }) => {
  const { ref, dragScrollProps } = useDragScroll();
  return (
    <div ref={ref} className="mc-strip" {...dragScrollProps}>
      {children}
    </div>
  );
};

const MissionSkeleton = () => (
  <div className="mc-skeleton" aria-busy="true" aria-label="Đang tải">
    <div className="admin-kpi-grid admin-kpi-grid--4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="mc-skeleton__kpi" />
      ))}
    </div>
    <div className="mc-skeleton__row" />
    <div className="mc-skeleton__row" />
    <div className="mc-skeleton__row" />
  </div>
);

const TemplateRow = ({
  item,
  campaigns,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  onRestore,
  isToggling,
  isDuplicating,
  isDeleting,
  isRestoring,
  isDeletedView,
}) => {
  const displayTitle = getMissionDisplayTitle(item);
  const campaignTitle = resolveCampaignTitle(item.campaignUuid, campaigns);
  const enrolledCount = item.enrolledCount ?? 0;
  const completedCount = item.completedCount ?? 0;
  const completionPct = enrolledCount > 0
    ? Math.min(100, Math.round((completedCount / enrolledCount) * 1000) / 10)
    : 0;
  const deletedLabel = isDeletedView && item.deletedAt ? formatAdminDateTime(item.deletedAt) : null;
  const theme = getMissionCardTheme(item);

  return (
    <article
      className={`mc-card ${isDeletedView ? 'is-deleted' : item.active ? 'is-on' : 'is-off'}`}
    >
      <div className="mc-card__media-wrap">
        <MissionCardCover theme={theme} />
        <div className="mc-card__points">
          <strong>+{item.rewardPoints ?? 0}</strong>
          <span>điểm</span>
        </div>
      </div>

      <div className="mc-card__body">
        <div className="mc-card__copy">
          <h3 className="mc-card__title">{displayTitle}</h3>
          <p className="mc-card__desc">{item.description}</p>
        </div>

        <div className="mc-card__meta">
          <span className="mc-chip">{getConditionLabel(item.conditionType)}</span>
          <span className="mc-chip mc-chip--muted">{getRecurrenceLabel(item.recurrence)}</span>
          {campaignTitle && (
            <span className="mc-chip mc-chip--amber">
              <Rocket size={11} />
              {campaignTitle}
            </span>
          )}
          {deletedLabel && (
            <span className="mc-chip mc-chip--amber">Xóa lúc {deletedLabel}</span>
          )}
        </div>

        {!isDeletedView && (
          <div className="mc-card__progress">
            <span className="mc-card__progress-pct">{completionPct}%</span>
            <div className="mc-card__progress-track">
              <div
                className="mc-card__progress-fill"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="mc-card__progress-hint">
              {completedCount}/{enrolledCount} hoàn thành
            </span>
          </div>
        )}

        <div className="mc-card__actions">
          {isDeletedView ? (
            <button
              type="button"
              className="mc-btn mc-btn--ghost"
              onClick={() => onRestore(item)}
              disabled={isRestoring}
            >
              <RotateCcw size={14} />
              {isRestoring ? 'Đang khôi phục...' : 'Khôi phục'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`mc-btn ${item.active ? 'mc-btn--live' : 'mc-btn--ghost'}`}
                onClick={() => onToggle(item)}
                disabled={isToggling}
                aria-pressed={item.active}
              >
                <Power size={12} />
                {isToggling ? 'Đang lưu...' : item.active ? 'Tắt' : 'Bật'}
              </button>
              <button type="button" className="mc-btn" onClick={() => onEdit(item)}>
                <Pencil size={14} />
                Sửa
              </button>
              <button
                type="button"
                className="mc-btn mc-btn--ghost"
                onClick={() => onDuplicate(item)}
                disabled={isDuplicating}
              >
                <Copy size={14} />
                {isDuplicating ? '...' : 'Sao chép'}
              </button>
              <button
                type="button"
                className="mc-btn mc-btn--danger"
                onClick={() => onDelete(item)}
                disabled={isDeleting}
              >
                <Trash2 size={14} />
                {isDeleting ? '...' : 'Xóa'}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

const CampaignRow = ({ item, onEdit, onArchive, onDelete, isArchiving, isDeleting }) => {
  const canDelete = (item.templateCount ?? 0) === 0;
  const canArchive = item.status !== 'ARCHIVED';
  const statusVariant =
    item.status === 'ACTIVE' ? 'success' : item.status === 'ARCHIVED' ? 'muted' : 'info';

  return (
    <article className={`mc-card mc-card--campaign is-${(item.status || 'DRAFT').toLowerCase()}`}>
      <div className="mc-card__media-wrap">
        <MissionCardCover theme={getCampaignCardTheme()} variant="campaign" />
        <div className="mc-card__points mc-card__points--status">
          <StatusBadge variant={statusVariant}>{getCampaignStatusLabel(item.status)}</StatusBadge>
        </div>
      </div>
      <div className="mc-card__body">
        <div className="mc-card__copy">
          <h3 className="mc-card__title">{item.title}</h3>
          <p className="mc-card__desc">{item.description}</p>
        </div>
        <div className="mc-card__meta">
          <span className="mc-chip mc-chip--amber">
            <CalendarRange size={12} />
            {formatAdminDateRange(item.startsAt, item.endsAt)}
          </span>
          <span className="mc-chip mc-chip--muted">{item.templateCount ?? 0} nhiệm vụ</span>
        </div>
        <div className="mc-card__actions">
          <button type="button" className="mc-btn" onClick={() => onEdit(item)}>
            <Pencil size={14} />
            Sửa
          </button>
          {canArchive && (
            <button
              type="button"
              className="mc-btn mc-btn--ghost"
              onClick={() => onArchive(item)}
              disabled={isArchiving}
            >
              <Archive size={14} />
              {isArchiving ? '...' : 'Lưu trữ'}
            </button>
          )}
          <button
            type="button"
            className="mc-btn mc-btn--danger"
            onClick={() => onDelete(item)}
            disabled={!canDelete || isDeleting}
            title={
              canDelete
                ? 'Xóa vĩnh viễn chiến dịch'
                : 'Gỡ nhiệm vụ khỏi chiến dịch trước khi xóa'
            }
          >
            <Trash2 size={14} />
            {isDeleting ? '...' : 'Xóa'}
          </button>
        </div>
      </div>
    </article>
  );
};

const MissionsPage = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [formTemplates, setFormTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [templatePage, setTemplatePage] = useState(1);
  const [campaignPage, setCampaignPage] = useState(1);
  const [pageSize, _setPageSize] = useState(10);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [templateModal, setTemplateModal] = useState({ open: false, template: null });
  const [campaignModal, setCampaignModal] = useState({ open: false, campaign: null });
  const [togglingCode, setTogglingCode] = useState(null);
  const [duplicatingCode, setDuplicatingCode] = useState(null);
  const [deletingCode, setDeletingCode] = useState(null);
  const [restoringCode, setRestoringCode] = useState(null);
  const [templateView, setTemplateView] = useState('active');
  const [archivingUuid, setArchivingUuid] = useState(null);
  const [deletingUuid, setDeletingUuid] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setTemplatePage(1);
    setCampaignPage(1);
  }, [debouncedSearch, templateView, activeTab]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [
        templateData,
        campaignData,
        analyticsData,
        campaignOptionsData,
        formTemplateData,
        deletedFormTemplateData,
      ] = await Promise.all([
        adminMissionService.getTemplates({
          deleted: templateView === 'deleted',
          query: debouncedSearch,
          page: templatePage - 1,
          size: pageSize,
        }),
        adminMissionService.getCampaigns({
          query: activeTab === 'campaigns' ? debouncedSearch : '',
          page: campaignPage - 1,
          size: pageSize,
        }),
        adminMissionService.getAnalytics(),
        adminMissionService.getCampaigns({ page: 0, size: 100 }),
        adminMissionService.getTemplates({ deleted: false, page: 0, size: 500 }),
        adminMissionService.getTemplates({ deleted: true, page: 0, size: 500 }),
      ]);
      setTemplates(templateData.items);
      setTemplateTotal(templateData.total);
      setCampaigns(campaignData.items);
      setCampaignTotal(campaignData.total);
      setAnalytics(analyticsData);
      setCampaignOptions(campaignOptionsData.items);
      const activeCodes = formTemplateData.items || [];
      const deletedCodes = deletedFormTemplateData.items || [];
      const byCode = new Map();
      [...activeCodes, ...deletedCodes].forEach((item) => {
        if (item?.code) byCode.set(String(item.code).toUpperCase(), item);
      });
      setFormTemplates([...byCode.values()]);
    } catch (error) {
      const message = error.message || 'Không thể tải dữ liệu nhiệm vụ.';
      setLoadError(message);
      setTemplates([]);
      setCampaigns([]);
      setAnalytics(null);
      notificationService.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, campaignPage, debouncedSearch, pageSize, templatePage, templateView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTemplates = analytics?.activeTemplates ?? templates.filter((item) => item.active).length;
  const liveCampaigns = analytics?.liveCampaigns ?? campaigns.filter((item) => item.status === 'ACTIVE').length;
  const totalTemplates = analytics?.totalTemplates ?? templateTotal;

  const missionKpis = [
    {
      label: 'Tổng nhiệm vụ',
      value: totalTemplates,
      badge: 'trong hệ thống',
      icon: Target,
      color: 'text-red-400',
      kpiClass: 'kpi-total',
    },
    {
      label: 'Nhiệm vụ đang bật',
      value: activeTemplates,
      badge: 'khán giả đang thấy',
      icon: Zap,
      color: 'text-emerald-400',
      kpiClass: 'kpi-showing',
    },
    {
      label: 'Chiến dịch đang chạy',
      value: liveCampaigns,
      badge: 'chiến dịch active',
      icon: Rocket,
      color: 'text-amber-400',
      kpiClass: 'kpi-upcoming',
    },
    {
      label: 'Tỷ lệ hoàn thành',
      value: analytics != null ? `${Math.round(analytics.overallCompletionRate ?? 0)}%` : '—',
      badge: 'trên toàn hệ thống',
      icon: BarChart3,
      color: 'text-sky-400',
      kpiClass: 'kpi-hidden',
    },
  ];

  const openCreate = () => {
    if (activeTab === 'templates') {
      setTemplateModal({ open: true, template: null });
    } else {
      setCampaignModal({ open: true, campaign: null });
    }
  };

  const handleToggleActive = async (template) => {
    const ok = await confirm({
      title: template.active ? 'Tắt nhiệm vụ' : 'Bật nhiệm vụ',
      message: template.active
        ? 'Khán giả sẽ không còn thấy nhiệm vụ này trên tab Nhiệm vụ.'
        : 'Khán giả sẽ thấy nhiệm vụ này trên tab Nhiệm vụ.',
      highlight: getMissionDisplayTitle(template),
      confirmLabel: template.active ? 'Tắt nhiệm vụ' : 'Bật nhiệm vụ',
      variant: 'warning',
    });
    if (!ok) return;

    setTogglingCode(template.code);
    try {
      await adminMissionService.toggleTemplateActive(template);
      notificationService.success(
        template.active
          ? `Đã tắt "${getMissionDisplayTitle(template)}". Khán giả không còn thấy nhiệm vụ này.`
          : `Đã bật "${getMissionDisplayTitle(template)}". Khán giả sẽ thấy trên tab Nhiệm vụ.`,
      );
      loadData();
    } catch (error) {
      notificationService.error(error.message || 'Không thể đổi trạng thái nhiệm vụ.');
    } finally {
      setTogglingCode(null);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const newCode = `${template.code}_COPY_${suffix}`;
    setDuplicatingCode(template.code);
    try {
      const created = await adminMissionService.duplicateTemplate(template.code, newCode);
      notificationService.success(`Đã tạo bản sao "${created.title || newCode}". Bản sao đang tắt — bật khi sẵn sàng.`);
      loadData();
    } catch (error) {
      notificationService.error(error.message || 'Không thể nhân bản nhiệm vụ.');
    } finally {
      setDuplicatingCode(null);
    }
  };

  const handleDeleteTemplate = async (template) => {
    const ok = await confirm({
      title: 'Xóa nhiệm vụ',
      message: 'Nhiệm vụ sẽ ẩn khỏi khán giả và có thể khôi phục trong tab "Đã xóa".',
      highlight: getMissionDisplayTitle(template),
      confirmLabel: 'Xóa nhiệm vụ',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingCode(template.code);
    try {
      await adminMissionService.softDeleteTemplate(template.code);
      notificationService.success(`Đã xóa "${getMissionDisplayTitle(template)}".`);
      loadData();
    } catch (error) {
      notificationService.error(error.message || 'Không thể xóa nhiệm vụ.');
    } finally {
      setDeletingCode(null);
    }
  };

  const handleRestoreTemplate = async (template) => {
    const ok = await confirm({
      title: 'Khôi phục nhiệm vụ',
      message: 'Khôi phục nhiệm vụ này? Bạn cần bật lại nếu muốn hiển thị với khán giả.',
      highlight: getMissionDisplayTitle(template),
      confirmLabel: 'Khôi phục',
      variant: 'warning',
    });
    if (!ok) return;

    setRestoringCode(template.code);
    try {
      const restored = await adminMissionService.restoreTemplate(template.code);
      notificationService.success(
        `Đã khôi phục "${restored.title || template.code}". Bật lại nếu muốn hiển thị với khán giả.`,
      );
      loadData();
    } catch (error) {
      notificationService.error(error.message || 'Không thể khôi phục nhiệm vụ.');
    } finally {
      setRestoringCode(null);
    }
  };

  const handleArchiveCampaign = async (campaign) => {
    if (!campaign?.uuid) return;
    const ok = await confirm({
      title: 'Lưu trữ chiến dịch',
      message: 'Chiến dịch sẽ ngừng hiển thị với khán giả. Bạn có thể xem lại trong danh sách đã lưu trữ.',
      highlight: campaign.title,
      confirmLabel: 'Lưu trữ',
      variant: 'warning',
    });
    if (!ok) return;

    setArchivingUuid(campaign.uuid);
    try {
      const updated = await adminMissionService.archiveCampaign(campaign.uuid);
      setCampaigns((prev) =>
        prev.map((item) => (item.uuid === campaign.uuid ? { ...item, ...updated } : item)),
      );
      notificationService.success(`Đã lưu trữ chiến dịch "${campaign.title}".`);
      loadData();
    } catch (error) {
      notificationService.error(error.message || 'Không thể lưu trữ chiến dịch.');
    } finally {
      setArchivingUuid(null);
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!campaign?.uuid) return;
    if ((campaign.templateCount ?? 0) > 0) {
      notificationService.error('Gỡ nhiệm vụ khỏi chiến dịch trước khi xóa.');
      return;
    }
    const ok = await confirm({
      title: 'Xóa vĩnh viễn chiến dịch',
      message: 'Chiến dịch sẽ bị xóa hoàn toàn và không thể khôi phục.',
      highlight: campaign.title,
      confirmLabel: 'Xóa vĩnh viễn',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingUuid(campaign.uuid);
    try {
      await adminMissionService.deleteCampaign(campaign.uuid);
      notificationService.success('Đã xóa chiến dịch.');
      loadData();
    } catch (error) {
      notificationService.error(error.message || 'Không thể xóa chiến dịch.');
    } finally {
      setDeletingUuid(null);
    }
  };

  return (
    <AdminPage className="mc-page">
      <PageHeader
        eyebrow="Trung tâm điều phối nhiệm vụ"
        title="Quản lý nhiệm vụ"
        description="Bật hoặc tắt nhiệm vụ cho khán giả và gom theo chiến dịch."
        primaryAction={
          activeTab === 'templates' && templateView === 'deleted'
            ? undefined
            : {
                label: activeTab === 'templates' ? 'Thêm nhiệm vụ' : 'Thêm chiến dịch',
                icon: <Plus size={16} />,
                onClick: openCreate,
              }
        }
      />

      <AdminKpiGrid items={missionKpis} />

      <section className="mc-section">
        <div className="mc-section__head">
          <h2 className="mc-section__title">
            <LayoutGrid className="w-3.5 h-3.5" />
            {activeTab === 'templates'
              ? templateView === 'deleted'
                ? 'Nhiệm vụ đã xóa'
                : 'Nhiệm vụ đang quản lý'
              : 'Chiến dịch'}
          </h2>
        </div>

        <div className="mc-toolbar">
          <div className="mc-toolbar__row">
            <FilterPills
              value={activeTab}
              onChange={(id) => {
                setActiveTab(id);
                setSearch('');
              }}
              items={[
                {
                  id: 'templates',
                  label: 'Nhiệm vụ',
                  count:
                    templateView === 'deleted'
                      ? (analytics?.deletedTemplates ?? templateTotal)
                      : (analytics?.totalTemplates ?? templateTotal),
                },
                {
                  id: 'campaigns',
                  label: 'Chiến dịch',
                  count: analytics?.totalCampaigns ?? campaignTotal,
                },
              ]}
              ariaLabel="Loại nội dung nhiệm vụ"
            />

            {activeTab === 'templates' && (
              <FilterPills
                value={templateView}
                onChange={(id) => {
                  setTemplateView(id);
                  setSearch('');
                }}
                items={[
                  { id: 'active', label: 'Đang quản lý' },
                  { id: 'deleted', label: 'Đã xóa' },
                ]}
                ariaLabel="Lọc nhiệm vụ"
              />
            )}

            <label className="mc-search">
              <Search size={15} className="mc-search__icon" />
              <input
                type="search"
                className="adm-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === 'templates' ? 'Nhập tên nhiệm vụ...' : 'Nhập tên chiến dịch...'}
              />
            </label>
          </div>
        </div>

      {isLoading ? (
        <MissionSkeleton />
      ) : loadError ? (
        <div className="mc-empty mc-empty--error">
          <Target size={28} strokeWidth={1.5} />
          <strong>Không tải được dữ liệu</strong>
          <p>{loadError}</p>
          <PrimaryButton type="button" onClick={loadData}>
            <RefreshCw size={16} />
            Thử lại
          </PrimaryButton>
        </div>
      ) : (
      <TabTransition activeKey={`${activeTab}-${templateView}`}>
      {activeTab === 'templates' ? (
        templates.length === 0 ? (
          <div className="mc-empty">
            <Target size={28} strokeWidth={1.5} />
            <strong>
              {search
                ? 'Không tìm thấy nhiệm vụ'
                : templateView === 'deleted'
                  ? 'Chưa có nhiệm vụ đã xóa'
                  : 'Chưa có nhiệm vụ'}
            </strong>
            <p>
              {search
                ? 'Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
                : templateView === 'deleted'
                  ? 'Các nhiệm vụ bạn xóa mềm sẽ xuất hiện tại đây để khôi phục.'
                  : 'Tạo nhiệm vụ đầu tiên để khán giả nhận điểm khi đặt vé, xem phim hoặc review.'}
            </p>
            {!search && templateView === 'active' && (
              <PrimaryButton type="button" onClick={openCreate}>
                <Plus size={16} />
                Thêm nhiệm vụ
              </PrimaryButton>
            )}
          </div>
        ) : (
          <>
            <MissionStrip>
              {templates.map((item) => (
                <TemplateRow
                  key={item.uuid || item.code}
                  item={item}
                  campaigns={campaignOptions}
                  onEdit={(template) => setTemplateModal({ open: true, template })}
                  onToggle={handleToggleActive}
                  onDuplicate={handleDuplicateTemplate}
                  onDelete={handleDeleteTemplate}
                  onRestore={handleRestoreTemplate}
                  isToggling={togglingCode === item.code}
                  isDuplicating={duplicatingCode === item.code}
                  isDeleting={deletingCode === item.code}
                  isRestoring={restoringCode === item.code}
                  isDeletedView={templateView === 'deleted'}
                />
              ))}
            </MissionStrip>
          </>
        )
      ) : campaigns.length === 0 ? (
        <div className="mc-empty">
          <Rocket size={28} strokeWidth={1.5} />
          <strong>{search ? 'Không tìm thấy chiến dịch' : 'Chưa có chiến dịch'}</strong>
          <p>
            {search
              ? 'Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
              : 'Chiến dịch giúp gom nhiệm vụ theo mùa, Tết hoặc sự kiện đặc biệt.'}
          </p>
          {!search && (
            <PrimaryButton type="button" onClick={openCreate}>
              <Plus size={16} />
              Thêm chiến dịch
            </PrimaryButton>
          )}
        </div>
      ) : (
        <>
          <MissionStrip>
            {campaigns.map((item) => (
              <CampaignRow
                key={item.uuid || item.code}
                item={item}
                onEdit={(campaign) => setCampaignModal({ open: true, campaign })}
                onArchive={handleArchiveCampaign}
                onDelete={handleDeleteCampaign}
                isArchiving={archivingUuid === item.uuid}
                isDeleting={deletingUuid === item.uuid}
              />
            ))}
          </MissionStrip>
        </>
      )}
      </TabTransition>
      )}
      </section>

      {!isLoading && !loadError && activeTab === 'templates' && templateTotal > pageSize && (
        <Pagination
          currentPage={templatePage}
          totalItems={templateTotal}
          itemsPerPage={pageSize}
          onPageChange={setTemplatePage}
        />
      )}

      {!isLoading && !loadError && activeTab === 'campaigns' && campaignTotal > pageSize && (
        <Pagination
          currentPage={campaignPage}
          totalItems={campaignTotal}
          itemsPerPage={pageSize}
          onPageChange={setCampaignPage}
        />
      )}

      <AdminModal
        open={templateModal.open}
        title={templateModal.template ? 'Sửa nhiệm vụ' : 'Thêm nhiệm vụ'}
        size="xl"
        onClose={() => setTemplateModal({ open: false, template: null })}
      >
        <MissionFormPanel
          template={templateModal.template}
          campaigns={campaignOptions}
          existingTemplates={formTemplates}
          onCancel={() => setTemplateModal({ open: false, template: null })}
          onSuccess={() => {
            setTemplateModal({ open: false, template: null });
            loadData();
          }}
        />
      </AdminModal>

      <AdminModal
        open={campaignModal.open}
        title={campaignModal.campaign ? 'Sửa chiến dịch' : 'Thêm chiến dịch'}
        size="lg"
        onClose={() => setCampaignModal({ open: false, campaign: null })}
      >
        <MissionCampaignFormPanel
          campaign={campaignModal.campaign}
          onCancel={() => setCampaignModal({ open: false, campaign: null })}
          onSuccess={() => {
            setCampaignModal({ open: false, campaign: null });
            loadData();
          }}
        />
      </AdminModal>
    </AdminPage>
  );
};

export default MissionsPage;

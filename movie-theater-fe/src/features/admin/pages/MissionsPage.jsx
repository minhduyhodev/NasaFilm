import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  CalendarRange,
  Copy,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Rocket,
  Search,
  Target,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { adminMissionService } from '../api/adminMissionService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import AdminModal from '../components/AdminModal';
import MissionFormPanel from '../components/panels/MissionFormPanel';
import MissionCampaignFormPanel from '../components/panels/MissionCampaignFormPanel';
import { AdminPage, PageHeader, PrimaryButton } from '../components';
import {
  formatAdminDateRange,
  formatAdminDateTime,
  getCampaignStatusLabel,
  getConditionLabel,
  getMissionDisplayTitle,
  getRecurrenceLabel,
  resolveCampaignTitle,
} from '../utils/missionAdminUtils';
import './MissionsPage.css';

const CAMPAIGN_STATUS_CLASS = {
  DRAFT: 'is-draft',
  ACTIVE: 'is-live',
  ARCHIVED: 'is-archived',
};

const MissionSkeleton = () => (
  <div className="mc-skeleton" aria-busy="true" aria-label="Đang tải">
    <div className="mc-skeleton__kpi" />
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
  const deletedLabel = isDeletedView && item.deletedAt ? formatAdminDateTime(item.deletedAt) : null;

  return (
    <article
      className={`mc-row mc-row--template ${isDeletedView ? 'is-deleted' : item.active ? 'is-on' : 'is-off'}`}
    >
      <div className="mc-row__signal" aria-hidden="true" />

      <div className="mc-row__identity">
        <div className="mc-row__copy">
          <h3 className="mc-row__title">{displayTitle}</h3>
          <p className="mc-row__desc">{item.description}</p>
          <div className="mc-row__tags">
            <span className="mc-tag mc-tag--muted">{getConditionLabel(item.conditionType)}</span>
            <span className="mc-tag">{getRecurrenceLabel(item.recurrence)}</span>
            {campaignTitle && (
              <span className="mc-row__campaign">
                <Rocket size={11} />
                {campaignTitle}
              </span>
            )}
            {deletedLabel && (
              <span className="mc-tag mc-tag--calendar">Xóa lúc {deletedLabel}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mc-row__metrics">
        <div className="mc-row__points">
          <strong>+{item.rewardPoints ?? 0}</strong>
          <span>điểm</span>
        </div>
        <div className="mc-row__stats">
          <span>{enrolledCount} tham gia</span>
          <span>{completedCount} hoàn thành</span>
        </div>
      </div>

      <div className="mc-row__actions">
        {isDeletedView ? (
          <button
            type="button"
            className="mc-row__edit mc-row__edit--ghost"
            onClick={() => onRestore(item)}
            disabled={isRestoring}
            title="Khôi phục nhiệm vụ"
          >
            <RotateCcw size={14} />
            {isRestoring ? 'Đang khôi phục...' : 'Khôi phục'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`mc-toggle ${item.active ? 'is-on' : 'is-off'}`}
              onClick={() => onToggle(item)}
              disabled={isToggling}
              aria-pressed={item.active}
              title={item.active ? 'Bấm để tắt hiển thị với khán giả' : 'Bấm để bật hiển thị với khán giả'}
            >
              <Power size={12} />
              {isToggling ? 'Đang lưu...' : item.active ? 'Đang bật' : 'Đã tắt'}
            </button>
            <button type="button" className="mc-row__edit" onClick={() => onEdit(item)}>
              <Pencil size={14} />
              Sửa
            </button>
            <button
              type="button"
              className="mc-row__edit mc-row__edit--ghost"
              onClick={() => onDuplicate(item)}
              disabled={isDuplicating}
              title="Tạo bản sao (tắt mặc định)"
            >
              <Copy size={14} />
              {isDuplicating ? 'Đang sao...' : 'Sao chép'}
            </button>
            <button
              type="button"
              className="mc-row__edit mc-row__edit--danger"
              onClick={() => onDelete(item)}
              disabled={isDeleting}
              title="Xóa mềm — có thể khôi phục sau"
            >
              <Trash2 size={14} />
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </button>
          </>
        )}
      </div>
    </article>
  );
};

const CampaignRow = ({ item, onEdit, onArchive, onDelete, isArchiving, isDeleting }) => {
  const statusClass = CAMPAIGN_STATUS_CLASS[item.status] || 'is-draft';
  const canDelete = (item.templateCount ?? 0) === 0;
  const canArchive = item.status !== 'ARCHIVED';

  return (
    <article className={`mc-row mc-row--campaign ${statusClass}`}>
      <div className="mc-row__signal" aria-hidden="true" />

      <div className="mc-row__identity">
        <div className="mc-row__copy">
          <h3 className="mc-row__title">{item.title}</h3>
          <p className="mc-row__desc">{item.description}</p>
        </div>
      </div>

      <div className="mc-row__tags">
        <span className="mc-tag mc-tag--calendar">
          <CalendarRange size={12} />
          {formatAdminDateRange(item.startsAt, item.endsAt)}
        </span>
        <span className="mc-tag mc-tag--muted">{item.templateCount ?? 0} nhiệm vụ</span>
      </div>

      <div className="mc-row__actions mc-row__actions--campaign">
        <span className={`mc-pill ${statusClass}`}>
          {getCampaignStatusLabel(item.status)}
        </span>
        <button type="button" className="mc-row__edit" onClick={() => onEdit(item)}>
          <Pencil size={14} />
          Sửa
        </button>
        {canArchive && (
          <button
            type="button"
            className="mc-row__edit mc-row__edit--ghost"
            onClick={() => onArchive(item)}
            disabled={isArchiving}
            title="Ẩn chiến dịch với khán giả"
          >
            <Archive size={14} />
            {isArchiving ? 'Đang lưu...' : 'Lưu trữ'}
          </button>
        )}
        <button
          type="button"
          className="mc-row__edit mc-row__edit--danger"
          onClick={() => onDelete(item)}
          disabled={!canDelete || isDeleting}
          title={
            canDelete
              ? 'Xóa vĩnh viễn chiến dịch'
              : 'Gỡ nhiệm vụ khỏi chiến dịch trước khi xóa'
          }
        >
          <Trash2 size={14} />
          {isDeleting ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </article>
  );
};

const MissionsPage = () => {
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
  const [pageSize, setPageSize] = useState(10);
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
      ]);
      setTemplates(templateData.items);
      setTemplateTotal(templateData.total);
      setCampaigns(campaignData.items);
      setCampaignTotal(campaignData.total);
      setAnalytics(analyticsData);
      setCampaignOptions(campaignOptionsData.items);
      setFormTemplates(formTemplateData.items);
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

  const openCreate = () => {
    if (activeTab === 'templates') {
      setTemplateModal({ open: true, template: null });
    } else {
      setCampaignModal({ open: true, campaign: null });
    }
  };

  const handleToggleActive = async (template) => {
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
    const confirmed = window.confirm(
      `Xóa nhiệm vụ "${getMissionDisplayTitle(template)}"?\n\nNhiệm vụ sẽ ẩn khỏi khán giả và có thể khôi phục trong tab "Đã xóa".`,
    );
    if (!confirmed) return;

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
    const confirmed = window.confirm(`Xóa vĩnh viễn chiến dịch "${campaign.title}"?`);
    if (!confirmed) return;

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
        secondaryActions={[
          {
            label: 'Làm mới',
            icon: <RefreshCw size={15} className={isLoading ? 'mc-spin' : ''} />,
            onClick: loadData,
            disabled: isLoading,
          },
        ]}
      />

      <div className="mc-kpis">
        <div className="mc-kpi">
          <div className="mc-kpi__icon mc-kpi__icon--red">
            <Zap size={18} />
          </div>
          <div>
            <strong>{activeTemplates}</strong>
            <span>Nhiệm vụ đang bật</span>
          </div>
        </div>
        <div className="mc-kpi">
          <div className="mc-kpi__icon mc-kpi__icon--amber">
            <Rocket size={18} />
          </div>
          <div>
            <strong>{liveCampaigns}</strong>
            <span>Chiến dịch đang chạy</span>
          </div>
        </div>
        <div className="mc-kpi">
          <div className="mc-kpi__icon mc-kpi__icon--green">
            <Users size={18} />
          </div>
          <div>
            <strong>{analytics?.distinctParticipants ?? '—'}</strong>
            <span>Người tham gia</span>
          </div>
        </div>
        <div className="mc-kpi">
          <div className="mc-kpi__icon mc-kpi__icon--red">
            <Target size={18} />
          </div>
          <div>
            <strong>
              {analytics != null ? `${Math.round(analytics.overallCompletionRate ?? 0)}%` : '—'}
            </strong>
            <span>Tỷ lệ hoàn thành</span>
          </div>
        </div>
        <div className="mc-kpi">
          <div className="mc-kpi__icon mc-kpi__icon--amber">
            <BarChart3 size={18} />
          </div>
          <div>
            <strong>{analytics?.totalPointsAwarded?.toLocaleString('vi-VN') ?? '—'}</strong>
            <span>Điểm thưởng đã trao</span>
          </div>
        </div>
      </div>

      {analytics?.topTemplates?.length > 0 && (
        <section className="mc-analytics" aria-label="Nhiệm vụ nổi bật">
          <div className="mc-analytics__head">
            <BarChart3 size={16} />
            <h3>Top nhiệm vụ theo lượt tham gia</h3>
          </div>
          <ul className="mc-analytics__list">
            {analytics.topTemplates.map((item) => (
              <li key={item.code} className="mc-analytics__item">
                <div>
                  <strong>{item.title || item.code}</strong>
                  <span>
                    {item.enrolledCount} tham gia · {item.completedCount} hoàn thành
                  </span>
                </div>
                <span className="mc-analytics__rate">
                  {Math.round(item.completionRate ?? 0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mc-toolbar">
        <div className="mc-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'templates'}
            className={activeTab === 'templates' ? 'is-active' : ''}
            onClick={() => {
              setActiveTab('templates');
              setSearch('');
            }}
          >
            <Target size={15} />
            Nhiệm vụ
            <span className="mc-tabs__count">
              {templateView === 'deleted'
                ? (analytics?.deletedTemplates ?? templateTotal)
                : (analytics?.totalTemplates ?? templateTotal)}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'campaigns'}
            className={activeTab === 'campaigns' ? 'is-active' : ''}
            onClick={() => {
              setActiveTab('campaigns');
              setSearch('');
            }}
          >
            <Rocket size={15} />
            Chiến dịch
            <span className="mc-tabs__count">{analytics?.totalCampaigns ?? campaignTotal}</span>
          </button>
        </div>

        <label className="mc-search">
          <Search size={15} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'templates' ? 'Tìm tên nhiệm vụ...' : 'Tìm tên chiến dịch...'}
          />
        </label>
      </div>

      {activeTab === 'templates' && (
        <div className="mc-subtabs" role="tablist" aria-label="Lọc nhiệm vụ">
          <button
            type="button"
            role="tab"
            aria-selected={templateView === 'active'}
            className={templateView === 'active' ? 'is-active' : ''}
            onClick={() => {
              setTemplateView('active');
              setSearch('');
            }}
          >
            Đang quản lý
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={templateView === 'deleted'}
            className={templateView === 'deleted' ? 'is-active' : ''}
            onClick={() => {
              setTemplateView('deleted');
              setSearch('');
            }}
          >
            Đã xóa
          </button>
        </div>
      )}

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
      ) : activeTab === 'templates' ? (
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
          <div className="mc-list">
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
          </div>
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
        <div className="mc-list">
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
        </div>
      )}

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

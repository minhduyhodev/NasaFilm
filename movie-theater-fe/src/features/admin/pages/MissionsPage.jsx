import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarRange,
  Copy,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Rocket,
  Search,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { adminMissionService } from '../api/adminMissionService';
import { notificationService } from '../../../shared/services/notificationService';
import AdminModal from '../components/AdminModal';
import MissionFormPanel from '../components/panels/MissionFormPanel';
import MissionCampaignFormPanel from '../components/panels/MissionCampaignFormPanel';
import { AdminPage, PageHeader, PrimaryButton } from '../components';
import {
  filterByQuery,
  formatAdminDateRange,
  getCampaignStatusLabel,
  getMissionDisplayTitle,
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

const TemplateRow = ({ item, campaigns, onEdit, onToggle, onDuplicate, isToggling, isDuplicating }) => {
  const displayTitle = getMissionDisplayTitle(item);
  const campaignTitle = resolveCampaignTitle(item.campaignUuid, campaigns);

  return (
    <article
      className={`mc-row mc-row--template ${item.active ? 'is-on' : 'is-off'}`}
    >
      <div className="mc-row__signal" aria-hidden="true" />

      <div className="mc-row__identity">
        <div className="mc-row__copy">
          <h3 className="mc-row__title">{displayTitle}</h3>
          <p className="mc-row__desc">{item.description}</p>
          {campaignTitle && (
            <span className="mc-row__campaign">
              <Rocket size={11} />
              {campaignTitle}
            </span>
          )}
        </div>
      </div>

      <div className="mc-row__metrics">
        <div className="mc-row__points">
          <strong>+{item.rewardPoints ?? 0}</strong>
          <span>điểm</span>
        </div>
      </div>

      <div className="mc-row__actions">
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
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [templateModal, setTemplateModal] = useState({ open: false, template: null });
  const [campaignModal, setCampaignModal] = useState({ open: false, campaign: null });
  const [togglingCode, setTogglingCode] = useState(null);
  const [duplicatingCode, setDuplicatingCode] = useState(null);
  const [archivingUuid, setArchivingUuid] = useState(null);
  const [deletingUuid, setDeletingUuid] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [templateData, campaignData] = await Promise.all([
        adminMissionService.getTemplates(),
        adminMissionService.getCampaigns(),
      ]);
      setTemplates(Array.isArray(templateData) ? templateData : []);
      setCampaigns(Array.isArray(campaignData) ? campaignData : []);
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải dữ liệu nhiệm vụ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTemplates = templates.filter((item) => item.active).length;
  const liveCampaigns = campaigns.filter((item) => item.status === 'ACTIVE').length;

  const filteredTemplates = useMemo(
    () => filterByQuery(templates, search),
    [templates, search],
  );
  const filteredCampaigns = useMemo(
    () => filterByQuery(campaigns, search),
    [campaigns, search],
  );

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
      setTemplates((prev) =>
        prev.map((item) =>
          item.code === template.code ? { ...item, active: !item.active } : item,
        ),
      );
      notificationService.success(
        template.active
          ? `Đã tắt "${getMissionDisplayTitle(template)}". Khán giả không còn thấy nhiệm vụ này.`
          : `Đã bật "${getMissionDisplayTitle(template)}". Khán giả sẽ thấy trên tab Nhiệm vụ.`,
      );
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
      setTemplates((prev) => [...prev, created]);
      notificationService.success(`Đã tạo bản sao "${created.title || newCode}". Bản sao đang tắt — bật khi sẵn sàng.`);
    } catch (error) {
      notificationService.error(error.message || 'Không thể nhân bản nhiệm vụ.');
    } finally {
      setDuplicatingCode(null);
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
      setCampaigns((prev) => prev.filter((item) => item.uuid !== campaign.uuid));
      notificationService.success('Đã xóa chiến dịch.');
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
        primaryAction={{
          label: activeTab === 'templates' ? 'Thêm nhiệm vụ' : 'Thêm chiến dịch',
          icon: <Plus size={16} />,
          onClick: openCreate,
        }}
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
      </div>

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
            <span className="mc-tabs__count">{templates.length}</span>
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
            <span className="mc-tabs__count">{campaigns.length}</span>
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

      {isLoading ? (
        <MissionSkeleton />
      ) : activeTab === 'templates' ? (
        filteredTemplates.length === 0 ? (
          <div className="mc-empty">
            <Target size={28} strokeWidth={1.5} />
            <strong>{search ? 'Không tìm thấy nhiệm vụ' : 'Chưa có nhiệm vụ'}</strong>
            <p>
              {search
                ? 'Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
                : 'Tạo nhiệm vụ đầu tiên để khán giả nhận điểm khi đặt vé, xem phim hoặc review.'}
            </p>
            {!search && (
              <PrimaryButton type="button" onClick={openCreate}>
                <Plus size={16} />
                Thêm nhiệm vụ
              </PrimaryButton>
            )}
          </div>
        ) : (
          <div className="mc-list">
            {filteredTemplates.map((item) => (
              <TemplateRow
                key={item.uuid || item.code}
                item={item}
                campaigns={campaigns}
                onEdit={(template) => setTemplateModal({ open: true, template })}
                onToggle={handleToggleActive}
                onDuplicate={handleDuplicateTemplate}
                isToggling={togglingCode === item.code}
                isDuplicating={duplicatingCode === item.code}
              />
            ))}
          </div>
        )
      ) : filteredCampaigns.length === 0 ? (
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
          {filteredCampaigns.map((item) => (
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

      <AdminModal
        open={templateModal.open}
        title={templateModal.template ? 'Sửa nhiệm vụ' : 'Thêm nhiệm vụ'}
        onClose={() => setTemplateModal({ open: false, template: null })}
      >
        <MissionFormPanel
          template={templateModal.template}
          campaigns={campaigns}
          existingTemplates={templates}
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

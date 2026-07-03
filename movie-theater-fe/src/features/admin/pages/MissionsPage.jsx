import React, { useCallback, useEffect, useState } from "react";
import { Rocket, Target } from "lucide-react";
import { adminMissionService } from "../api/adminMissionService";
import { notificationService } from "../../../shared/services/notificationService";
import AdminModal from "../components/AdminModal";
import MissionFormPanel from "../components/panels/MissionFormPanel";
import MissionCampaignFormPanel from "../components/panels/MissionCampaignFormPanel";
import { AdminPage, PageHeader } from "../components";
import { MISSION_RECURRENCE_LABELS } from "../../home/utils/missionUtils";
import "./MissionsPage.css";

const CAMPAIGN_STATUS_LABELS = {
  DRAFT: "Nháp",
  ACTIVE: "Đang chạy",
  ARCHIVED: "Lưu trữ",
};

const formatDateRange = (startsAt, endsAt) => {
  const start = startsAt ? String(startsAt).slice(0, 10) : "Chưa đặt";
  const end = endsAt ? String(endsAt).slice(0, 10) : "Chưa đặt";
  return `${start} đến ${end}`;
};

const MissionsPage = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templateModal, setTemplateModal] = useState({
    open: false,
    template: null,
  });
  const [campaignModal, setCampaignModal] = useState({
    open: false,
    campaign: null,
  });

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
      notificationService.error(
        error.message || "Không thể tải dữ liệu nhiệm vụ.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTemplates = templates.filter((item) => item.active).length;
  const liveCampaigns = campaigns.filter((item) => item.status === "ACTIVE").length;
  const totalCompletions = templates.reduce(
    (sum, item) => sum + (item.completedCount ?? 0),
    0,
  );

  return (
    <AdminPage>
      <PageHeader
        title="Nhiệm Vụ"
        description="Quản lý nhiệm vụ, chiến dịch và vòng đời phần thưởng NASA"
        primaryAction={{
          label:
            activeTab === "templates" ? "Thêm nhiệm vụ" : "Thêm chiến dịch",
          onClick: () => {
            if (activeTab === "templates") {
              setTemplateModal({ open: true, template: null });
            } else {
              setCampaignModal({ open: true, campaign: null });
            }
          },
        }}
      />

      <div className="missions-admin-tabs">
        <button
          type="button"
          className={activeTab === "templates" ? "active" : ""}
          onClick={() => setActiveTab("templates")}
        >
          <Target size={16} /> Nhiệm vụ ({templates.length})
        </button>
        <button
          type="button"
          className={activeTab === "campaigns" ? "active" : ""}
          onClick={() => setActiveTab("campaigns")}
        >
          <Rocket size={16} /> Chiến dịch ({campaigns.length})
        </button>
      </div>

      <div className="missions-admin-kpis">
        <div className="missions-admin-kpi">
          <strong>{activeTemplates}</strong>
          <span>Nhiệm vụ đang bật</span>
        </div>
        <div className="missions-admin-kpi">
          <strong>{liveCampaigns}</strong>
          <span>Chiến dịch đang chạy</span>
        </div>
        <div className="missions-admin-kpi">
          <strong>{totalCompletions}</strong>
          <span>Lượt hoàn thành</span>
        </div>
      </div>

      {isLoading ? (
        <div className="missions-admin-loading">Đang tải...</div>
      ) : activeTab === "templates" ? (
        templates.length === 0 ? (
          <div className="missions-admin-empty">
            Chưa có nhiệm vụ. Bấm &quot;Thêm nhiệm vụ&quot; để tạo mục đầu tiên.
          </div>
        ) : (
        <div className="missions-admin-table-wrap">
          <table className="missions-admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Chu kỳ</th>
                <th>Điểm</th>
                <th>Hoàn thành</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {templates.map((item) => (
                <tr key={item.uuid || item.code}>
                  <td>{item.code}</td>
                  <td>
                    <div className="missions-admin-title">{item.title}</div>
                    <div className="missions-admin-desc">
                      {item.description}
                    </div>
                  </td>
                  <td>{MISSION_RECURRENCE_LABELS[item.recurrence] || item.recurrence || "Một lần"}</td>
                  <td>{item.rewardPoints ?? 0}</td>
                  <td>
                    {item.completedCount ?? 0} / {item.enrolledCount ?? 0}
                  </td>
                  <td>
                    <span
                      className={`missions-admin-pill ${item.active ? "is-active" : "is-off"}`}
                    >
                      {item.active ? "Bật" : "Tắt"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="missions-admin-edit"
                      onClick={() =>
                        setTemplateModal({ open: true, template: item })
                      }
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      ) : campaigns.length === 0 ? (
        <div className="missions-admin-empty">
          Chưa có chiến dịch. Tạo chiến dịch để gom nhiệm vụ theo mùa hoặc sự kiện.
        </div>
      ) : (
        <div className="missions-admin-table-wrap">
          <table className="missions-admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Trạng thái</th>
                <th>Nhiệm vụ</th>
                <th>Thời gian</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((item) => (
                <tr key={item.uuid || item.code}>
                  <td>{item.code}</td>
                  <td>
                    <div className="missions-admin-title">{item.title}</div>
                    <div className="missions-admin-desc">
                      {item.description}
                    </div>
                  </td>
                  <td>
                    <span className={`missions-admin-pill ${item.status === "ACTIVE" ? "is-live" : item.status === "ARCHIVED" ? "is-archived" : "is-draft"}`}>
                      {CAMPAIGN_STATUS_LABELS[item.status] || item.status}
                    </span>
                  </td>
                  <td>{item.templateCount ?? 0}</td>
                  <td>{formatDateRange(item.startsAt, item.endsAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="missions-admin-edit"
                      onClick={() =>
                        setCampaignModal({ open: true, campaign: item })
                      }
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={templateModal.open}
        title={templateModal.template ? "Sửa nhiệm vụ" : "Thêm nhiệm vụ"}
        onClose={() => setTemplateModal({ open: false, template: null })}
      >
        <MissionFormPanel
          template={templateModal.template}
          campaigns={campaigns}
          onCancel={() => setTemplateModal({ open: false, template: null })}
          onSuccess={() => {
            setTemplateModal({ open: false, template: null });
            loadData();
          }}
        />
      </AdminModal>

      <AdminModal
        open={campaignModal.open}
        title={campaignModal.campaign ? "Sửa chiến dịch" : "Thêm chiến dịch"}
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

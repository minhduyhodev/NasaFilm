import React from 'react';
import { Award, Lock, Rocket, Sparkles } from 'lucide-react';
import './MissionBoard.css';

const statusLabel = (mission) => {
  if (mission.visibility === 'LOCKED_FEATURE') {
    return 'Sắp mở';
  }
  if (mission.status === 'COMPLETED') {
    return 'Hoàn thành';
  }
  if (mission.status === 'LOCKED') {
    return 'Khóa';
  }
  return 'Đang làm';
};

const MissionBoard = ({ board, loading, error }) => {
  if (loading) {
    return (
      <div className="mission-board mission-board--loading">
        <div className="mission-board__spinner" />
        <p>Đang tải bảng nhiệm vụ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mission-board mission-board--error">
        <p>{error}</p>
      </div>
    );
  }

  if (!board) {
    return null;
  }

  const tier = board.tier ?? {};
  const missions = board.missions ?? [];
  const tierProgress = tier.nextTierAt
    ? Math.min((tier.lifetimeScore / tier.nextTierAt) * 100, 100)
    : 0;

  return (
    <div className="mission-board">
      <div className="mission-board__hero">
        <div className="mission-board__hero-copy">
          <span className="mission-board__eyebrow">Mission Control</span>
          <h3>Hành trình phi hành NASA</h3>
          <p>
            Hoàn thành nhiệm vụ để nhận điểm, huy hiệu và tiến gần hơn tới hạng tiếp theo.
          </p>
        </div>
        <div className="mission-board__tier-card">
          <div className="mission-board__tier-label">Hạng hiện tại</div>
          <div className="mission-board__tier-name">{tier.label || 'NASA Member'}</div>
          <div className="mission-board__tier-score">
            {(tier.lifetimeScore ?? 0).toLocaleString('vi-VN')} điểm
          </div>
          <div className="mission-board__tier-bar">
            <div className="mission-board__tier-fill" style={{ width: `${tierProgress}%` }} />
          </div>
          <div className="mission-board__tier-next">
            Mốc tiếp theo: {(tier.nextTierAt ?? 5000).toLocaleString('vi-VN')} điểm
          </div>
        </div>
      </div>

      <div className="mission-board__grid">
        {missions.map((mission) => {
          const completed = mission.status === 'COMPLETED';
          const locked = mission.visibility === 'LOCKED_FEATURE' || mission.status === 'LOCKED';
          const progress = mission.progress;
          const percent = progress?.target
            ? Math.min((progress.current / progress.target) * 100, 100)
            : completed
              ? 100
              : 0;

          return (
            <article
              key={mission.code}
              className={`mission-card ${completed ? 'is-completed' : ''} ${locked ? 'is-locked' : ''}`}
            >
              <div className="mission-card__header">
                <div className="mission-card__icon">
                  {locked ? <Lock size={18} /> : completed ? <Award size={18} /> : <Rocket size={18} />}
                </div>
                <span className="mission-card__status">{statusLabel(mission)}</span>
              </div>

              <h4 className="mission-card__title">{mission.title}</h4>
              <p className="mission-card__description">{mission.description}</p>

              {!completed && progress && (
                <div className="mission-card__progress">
                  <div className="mission-card__progress-meta">
                    <span>
                      {progress.current}/{progress.target} {progress.unit}
                    </span>
                    <span>{Math.round(percent)}%</span>
                  </div>
                  <div className="mission-card__progress-bar">
                    <div className="mission-card__progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )}

              <div className="mission-card__reward">
                <Sparkles size={14} />
                {mission.rewardPoints > 0 && <span>+{mission.rewardPoints} điểm</span>}
                {mission.rewardBadge?.title && <span>{mission.rewardBadge.title}</span>}
                {locked && <span>Chờ tính năng Orbit Seat</span>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default MissionBoard;

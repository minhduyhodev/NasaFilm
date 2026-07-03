import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  Film,
  Lock,
  MessageSquare,
  Rocket,
  Ticket,
  Trophy,
} from 'lucide-react';
import {
  formatCycleLabel,
  formatTierGap,
  getMissionTitleVi,
  MISSION_ACTION_HINTS,
  MISSION_RECURRENCE_LABELS,
  MISSION_TIER_LABEL_VI,
} from '../utils/missionUtils';
import './MissionBoard.css';

const fadeUp = (reduce, delay = 0) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
      };

const MissionSkeleton = () => (
  <div className="mission-board mission-board--loading" aria-busy="true" aria-label="Đang tải nhiệm vụ">
    <div className="mission-board__skeleton-intro" />
    <div className="mission-board__skeleton-list">
      <div /><div /><div /><div />
    </div>
  </div>
);

const MissionIcon = ({ mission, locked, completed }) => {
  if (completed) return <CheckCircle2 size={17} strokeWidth={2} />;
  if (locked) return <Lock size={17} strokeWidth={2} />;
  if (mission.code === 'REVIEWER') return <MessageSquare size={17} strokeWidth={2} />;
  if (mission.code === 'PREMIERE' || mission.code === 'HYBRID_PILOT') {
    return <Ticket size={17} strokeWidth={2} />;
  }
  if (mission.code === 'EXPLORER') return <Film size={17} strokeWidth={2} />;
  return <Rocket size={17} strokeWidth={2} />;
};

const getMissionCta = (mission, completed, locked) => {
  if (completed || locked) return null;
  if (mission.code === 'REVIEWER') {
    return { label: 'Xem phim', to: '/movies' };
  }
  if (mission.code === 'PREMIERE' || mission.code === 'EXPLORER' || mission.code === 'HYBRID_PILOT') {
    return { label: 'Khám phá phim', to: '/movies' };
  }
  return null;
};

const formatMissionReward = (mission) => {
  const parts = [];
  if (mission.rewardPoints > 0) {
    parts.push(`+${mission.rewardPoints} điểm`);
  }
  if (mission.rewardBadge?.title) {
    parts.push(mission.rewardBadge.title);
  }
  return parts.join(' · ');
};

const getRowState = (mission) => {
  if (mission.status === 'COMPLETED') return 'completed';
  if (mission.visibility === 'LOCKED_FEATURE' || mission.status === 'LOCKED') return 'locked';
  return 'active';
};

const MissionRow = ({ mission, index = 0 }) => {
  const completed = mission.status === 'COMPLETED';
  const locked = mission.visibility === 'LOCKED_FEATURE' || mission.status === 'LOCKED';
  const rowState = getRowState(mission);
  const progress = mission.progress;
  const percent = progress?.target
    ? Math.min((progress.current / progress.target) * 100, 100)
    : completed
      ? 100
      : 0;
  const cycleText = formatCycleLabel(mission);
  const actionHint = MISSION_ACTION_HINTS[mission.code];
  const cta = getMissionCta(mission, completed, locked);
  const reduceMotion = useReducedMotion();
  const progressCurrent = completed ? progress?.target ?? 1 : progress?.current ?? 0;
  const progressTarget = progress?.target ?? 1;
  const progressUnit = progress?.unit ?? '';

  return (
    <motion.article
      {...fadeUp(reduceMotion, index * 0.04)}
      className={`mission-row mission-row--${rowState}`}
      aria-label={
        completed
          ? `${mission.title} đã hoàn thành`
          : locked
            ? `${mission.title} chưa mở`
            : `${mission.title} chưa hoàn thành`
      }
    >
      <div className="mission-row__inner">
        <div className="mission-row__icon">
          <MissionIcon mission={mission} locked={locked} completed={completed} />
        </div>

        <div className="mission-row__main">
          <div className="mission-row__titles">
            <h4 className="mission-row__title">{getMissionTitleVi(mission)}</h4>
            <p className="mission-row__description">{mission.description}</p>
          </div>

          <div className="mission-row__meta">
            {cycleText && <span className="mission-row__chip">{cycleText}</span>}
            {mission.recurrence && mission.recurrence !== 'ONCE' && (
              <span className="mission-row__chip mission-row__chip--muted">
                {MISSION_RECURRENCE_LABELS[mission.recurrence]}
              </span>
            )}
            {!completed && !locked && actionHint && (
              <span className="mission-row__hint">{actionHint}</span>
            )}
            {locked && (
              <span className="mission-row__hint mission-row__hint--locked">
                {mission.code === 'SOCIAL_ORBIT'
                  ? 'Mở khi Phòng Orbit ra mắt.'
                  : 'Chưa khả dụng.'}
              </span>
            )}
          </div>
        </div>

        <div className="mission-row__aside">
          {formatMissionReward(mission) && (
            <span className="mission-row__reward">
              {formatMissionReward(mission)}
            </span>
          )}
          {cta && (
            <Link to={cta.to} className="mission-row__cta">
              {cta.label}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="mission-row__progress">
        <div
          className="mission-row__progress-bar"
          role="progressbar"
          aria-valuenow={progressCurrent}
          aria-valuemin={0}
          aria-valuemax={progressTarget}
          aria-label={`Tiến độ ${mission.title}`}
        >
          <div
            className="mission-row__progress-fill"
            style={{ width: `${completed ? 100 : percent}%` }}
          />
        </div>
        <span className="mission-row__progress-text">
          {completed
            ? 'Hoàn thành'
            : `${progressCurrent}/${progressTarget}${progressUnit ? ` ${progressUnit}` : ''} · ${Math.round(percent)}%`}
        </span>
      </div>
    </motion.article>
  );
};

const sortMissions = (missions) => {
  const order = { active: 0, locked: 1, completed: 2 };
  return [...missions].sort((a, b) => {
    const stateA = getRowState(a);
    const stateB = getRowState(b);
    if (order[stateA] !== order[stateB]) {
      return order[stateA] - order[stateB];
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
};

const MissionBoard = ({ board, loading, error, onRetry }) => {
  const reduceMotion = useReducedMotion();

  if (loading) {
    return <MissionSkeleton />;
  }

  if (error) {
    return (
      <div className="mission-board mission-board--error">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="mission-board__retry" onClick={onRetry}>
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (!board) {
    return null;
  }

  const tier = board.tier ?? {};
  const summary = board.summary ?? {};
  const activeMissions = board.activeMissions ?? board.missions?.filter((m) => m.status !== 'COMPLETED') ?? [];
  const completedMissions = board.completedMissions ?? board.missions?.filter((m) => m.status === 'COMPLETED') ?? [];
  const allMissions = sortMissions([...activeMissions, ...completedMissions]);
  const badges = board.badges ?? [];
  const recentCompletions = board.recentCompletions ?? [];
  const lifetimeScore = tier.lifetimeScore ?? 0;
  const nextTierAt = tier.nextTierAt ?? 5000;
  const tierProgress = nextTierAt ? Math.min((lifetimeScore / nextTierAt) * 100, 100) : 0;

  return (
    <div className="mission-board">
      <motion.header className="mission-board__intro" {...fadeUp(reduceMotion)}>
        <div className="mission-board__intro-copy">
          <h3 className="mission-board__title">Trung tâm nhiệm vụ NASA</h3>
          <p className="mission-board__lede">
            Làm nhiệm vụ khi đặt vé, xem phim và viết review để tích điểm thành viên.
          </p>
          {board.campaign?.title && (
            <div className="mission-board__campaign">
              <Trophy size={15} strokeWidth={2} />
              <span>Chiến dịch: {board.campaign.title}</span>
            </div>
          )}
        </div>

        <aside className="mission-board__tier-panel">
          <div className="mission-board__tier-orbit" aria-hidden="true">
            <span className="mission-board__tier-orbit-ring" />
            <Rocket size={18} strokeWidth={2} />
          </div>
          <div className="mission-board__tier-label">Hạng hiện tại</div>
          <div className="mission-board__tier-name">
            {MISSION_TIER_LABEL_VI[tier.label] || tier.label || 'Thành viên NASA'}
          </div>
          <div className="mission-board__tier-score">{lifetimeScore.toLocaleString('vi-VN')} điểm tích lũy</div>
          <div className="mission-board__tier-bar" aria-hidden="true">
            <div className="mission-board__tier-fill" style={{ width: `${tierProgress}%` }} />
          </div>
          <p className="mission-board__tier-gap">{formatTierGap(lifetimeScore, nextTierAt)}</p>
        </aside>
      </motion.header>

      {summary.allCompleted && activeMissions.length === 0 && (
        <div className="mission-board__notice mission-board__notice--success">
          <Trophy size={20} strokeWidth={2} />
          <div>
            <strong>Bạn đã hoàn thành tất cả nhiệm vụ hiện có.</strong>
            <p>Nhiệm vụ lặp sẽ reset theo chu kỳ. Theo dõi chiến dịch mới để tiếp tục nhận thưởng.</p>
          </div>
        </div>
      )}

      {badges.length > 0 && (
        <section className="mission-board__extras">
          <div className="mission-board__extras-head">
            <h4>Huy hiệu</h4>
            <span>{badges.length}</span>
          </div>
          <div className="mission-board__badge-list">
            {badges.map((badge) => (
              <span key={badge.code} className="mission-board__badge">
                {badge.title || badge.code}
              </span>
            ))}
          </div>
        </section>
      )}

      {recentCompletions.length > 0 && (
        <section className="mission-board__extras">
          <div className="mission-board__extras-head">
            <h4>Hoàn thành gần đây</h4>
          </div>
          <ul className="mission-board__recent-list">
            {recentCompletions.map((item) => (
              <li key={`${item.code}-${item.title}`}>
                <span>{getMissionTitleVi({ code: item.code, title: item.title })}</span>
                {item.pointsAwarded > 0 && <em>+{item.pointsAwarded} điểm</em>}
                {item.badge?.title && <em>{item.badge.title}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {allMissions.length > 0 && (
        <section className="mission-board__section">
          <div className="mission-board__section-head">
            <h4>Nhiệm vụ</h4>
            <span>{allMissions.length} mục</span>
          </div>
          <div className="mission-board__list">
            {allMissions.map((mission, index) => (
              <MissionRow key={`${mission.code}-${mission.cycleKey || 'once'}`} mission={mission} index={index} />
            ))}
          </div>
        </section>
      )}

      {allMissions.length === 0 && !summary.allCompleted && (
        <div className="mission-board__notice">
          <Rocket size={20} strokeWidth={2} />
          <div>
            <strong>Chưa có nhiệm vụ khả dụng.</strong>
            <p>Hãy quay lại sau khi hệ thống cập nhật chiến dịch mới.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionBoard;

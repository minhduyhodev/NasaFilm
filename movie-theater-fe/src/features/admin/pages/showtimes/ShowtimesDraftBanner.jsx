import React from 'react';

/**
 * Banner cảnh báo suất DRAFT chiếm phòng — tách khỏi ShowtimesPage để giảm merge conflict.
 */
const ShowtimesDraftBanner = ({ draftCount = 0, onViewDrafts }) => {
  if (!draftCount) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <span>
        Có <strong className="text-amber-100">{draftCount}</strong> suất nháp (DRAFT) trong ngày đang chọn — vẫn chiếm phòng khi tạo lịch mới.
      </span>
      <button
        type="button"
        className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
        onClick={onViewDrafts}
      >
        Xem suất nháp
      </button>
    </div>
  );
};

export default ShowtimesDraftBanner;

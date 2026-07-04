import React from 'react';
import { Loader2 } from 'lucide-react';
import TheaterSeatMapPanel from '../../../shared/components/seatmap/TheaterSeatMapPanel';
import { ORBIT_MEMBER_COLORS } from '../../../shared/utils/orbitUtils';

const OrbitSeatMapSection = ({
  seatRows,
  aisleLayout,
  hasGapViolation,
  disabled,
  isSyncing,
  isCheckout,
  canEditSeats,
  orbitSeatOwners,
  members = [],
  onSeatClick,
  onCoupleClick,
}) => {
  const footerNote = !canEditSeats
    ? (isCheckout ? 'Host đang thanh toán — ghế đã khóa cho nhóm.' : 'Phòng đã đóng.')
    : null;

  const legendExtras = members.length > 0 ? (
    <>
      {members.map((member, index) => {
        const color = ORBIT_MEMBER_COLORS[index % ORBIT_MEMBER_COLORS.length];
        return (
          <div key={member.userUuid} className="flex items-center gap-2.5">
            <div
              className={`w-9 h-6 rounded-lg border-2 flex items-center justify-center text-[9px] font-black orbit-legend-swatch ${color.cssClass}`}
            >
              {member.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-xs font-bold text-gray-300 truncate max-w-[8rem]">
              {member.displayName}
            </span>
          </div>
        );
      })}
    </>
  ) : null;

  return (
    <section className="lg:col-span-8 flex flex-col items-center bg-[#111215]/30 border border-white/5 p-6 rounded-2xl orbit-booking__panel">
      {isSyncing && (
        <p className="text-xs text-amber-400 mb-3 self-start flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Đang đồng bộ ghế…
        </p>
      )}
      <TheaterSeatMapPanel
        seatRows={seatRows}
        aisleLayout={aisleLayout}
        hasGapViolation={hasGapViolation}
        disabled={disabled}
        orbitSeatOwners={orbitSeatOwners}
        legendExtras={legendExtras}
        onSeatClick={onSeatClick}
        onCoupleClick={onCoupleClick}
        screenAccent="white"
        footerNote={footerNote}
      />
    </section>
  );
};

export default React.memo(OrbitSeatMapSection);

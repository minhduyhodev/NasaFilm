import React from 'react';
import { Loader2 } from 'lucide-react';
import TheaterSeatMapPanel from '../../../shared/components/seatmap/TheaterSeatMapPanel';

const OrbitSeatMapSection = ({
  seatRows,
  aisleLayout,
  hasGapViolation,
  disabled,
  isSyncing,
  isCheckout,
  canEditSeats,
  orbitSeatOwners,
  onSeatClick,
  onCoupleClick,
}) => {
  const footerNote = !canEditSeats
    ? (isCheckout ? 'Host đang thanh toán — ghế đã khóa cho nhóm.' : 'Phòng đã đóng.')
    : null;

  return (
    <section className="w-full flex flex-col items-center bg-[#111215]/30 border border-white/5 p-6 rounded-2xl orbit-booking__panel">
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
        onSeatClick={onSeatClick}
        onCoupleClick={onCoupleClick}
        screenAccent="white"
        footerNote={footerNote}
      />
    </section>
  );
};

export default React.memo(OrbitSeatMapSection);

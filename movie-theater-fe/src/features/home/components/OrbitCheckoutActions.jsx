import React from 'react';
import { Loader2, LogOut, Trash2 } from 'lucide-react';

const OrbitCheckoutActions = ({
  isHostUser,
  canEditSeats,
  isCheckout,
  isPreparing,
  allMembersReady,
  hasGapViolation,
  isGroupSeatLimitOk,
  checkoutBlockReason,
  showHost,
  onHostCheckout,
  onContinueCheckout,
  onAbortCheckout,
  onLeave,
  onCancelRoom,
}) => (
  <>
    {isHostUser && canEditSeats && checkoutBlockReason && (
      <p className="text-xs text-zinc-400 text-center px-2">{checkoutBlockReason}</p>
    )}

    {isHostUser && canEditSeats && showHost && (
      <button
        type="button"
        disabled={!allMembersReady || isPreparing || hasGapViolation || !isGroupSeatLimitOk}
        onClick={onHostCheckout}
        className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 hidden lg:flex"
      >
        {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Xác nhận nhóm &amp; thanh toán
      </button>
    )}

    {isHostUser && isCheckout && (
      <>
        <button
          type="button"
          disabled={isPreparing}
          onClick={onContinueCheckout}
          className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
        >
          {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Tiếp tục thanh toán
        </button>
        <button
          type="button"
          disabled={isPreparing}
          onClick={onAbortCheckout}
          className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5"
        >
          Quay lại chọn ghế
        </button>
      </>
    )}

    {!isHostUser && isCheckout && (
      <p className="text-sm text-zinc-400 text-center px-2">
        Host đang thanh toán nhóm. Vui lòng chờ xác nhận vé.
      </p>
    )}

    {!isHostUser && canEditSeats && (
      <button
        type="button"
        onClick={onLeave}
        className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5 flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Rời phòng
      </button>
    )}

    {isHostUser && canEditSeats && (
      <button
        type="button"
        onClick={onCancelRoom}
        className="orbit-booking__cta-cancel w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Hủy phòng Orbit
      </button>
    )}
  </>
);

export default React.memo(OrbitCheckoutActions);

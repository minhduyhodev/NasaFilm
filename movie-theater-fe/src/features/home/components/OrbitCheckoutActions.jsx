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
  hasSelectedSeats,
  onMemberConcessions,
  isMemberCompleted,
  onGoToWaitingPage,
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
        Xác nhận nhóm &amp; Tiếp tục
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
          Tiếp tục chọn bắp nước
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
        Chủ phòng đang thanh toán nhóm. Vui lòng chờ xác nhận vé.
      </p>
    )}

    {!isHostUser && canEditSeats && (
      <div className="flex flex-col gap-2.5 w-full">
        {hasSelectedSeats && (
          <button
            type="button"
            onClick={onMemberConcessions}
            className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Tiếp tục chọn bắp nước
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Rời phòng
        </button>
      </div>
    )}

    {!isHostUser && isMemberCompleted && (
      <div className="flex flex-col gap-2.5 w-full text-center">
        <p className="text-xs text-zinc-400 px-2 leading-relaxed font-semibold">
          Bạn đã hoàn tất chọn ghế &amp; bắp nước. Vui lòng chờ Host thanh toán đơn hàng.
        </p>
        <button
          type="button"
          onClick={onGoToWaitingPage}
          className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Xem phòng chờ
        </button>
      </div>
    )}

    {isHostUser && canEditSeats && (
      <button
        type="button"
        onClick={onCancelRoom}
        className="orbit-booking__cta-cancel w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Hủy phòng nhóm
      </button>
    )}
  </>
);

export default React.memo(OrbitCheckoutActions);

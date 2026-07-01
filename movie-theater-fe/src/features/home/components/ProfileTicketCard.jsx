import React from 'react';
import {
  formatDisplayTicketCode,
  formatShowtimeDisplay,
  getTicketArchiveMeta,
  isLiveTicket,
  isOnlineBooking,
} from '../utils/movieUtils';

const getMovieGlowClass = (title) => {
  const upper = (title || '').toUpperCase();
  if (upper.includes('STELLAR') || upper.includes('MORTAL')) return 'glow-gold';
  if (upper.includes('AETHERIA') || upper.includes('RED') || upper.includes('MƯA')) {
    return 'glow-purple';
  }
  return 'glow-cyan';
};

const ProfileTicketCard = ({ tkt, onTicketClick, onCancel, onRefund }) => {
  const isVod = isOnlineBooking(tkt);
  const isLive = isLiveTicket(tkt);
  const archived = !isLive;
  const archiveMeta = archived ? getTicketArchiveMeta(tkt) : null;
  const glowClass = getMovieGlowClass(tkt.movieTitle);

  return (
    <div
      className={`ticket-boarding-pass ${glowClass} ${isLive ? 'ticket-boarding-pass--live' : 'ticket-boarding-pass--inactive'}${isVod ? ' ticket-boarding-pass--vod' : ''}${archived ? ' ticket-boarding-pass--archived' : ''}`}
      onClick={() => isLive && onTicketClick?.(tkt)}
      style={{ cursor: isLive ? 'pointer' : 'default' }}
      title={
        !isLive
          ? archiveMeta?.label || 'Vé đã hết hạn hoặc không còn hiệu lực'
          : isVod
            ? 'Nhấn để kích hoạt hoặc tiếp tục xem phim online'
            : 'Nhấn để mở thẻ lên máy bay / in vé'
      }
    >
      {archived && archiveMeta && (
        <span className={`ticket-archive-badge ticket-archive-badge--${archiveMeta.tone}`}>
          {archiveMeta.label}
        </span>
      )}

      <div className="ticket-notch-top" />
      <div className="ticket-notch-bottom" />

      <div className="ticket-body-left">
        <span className="ticket-format-badge">
          {isVod ? 'VOD ONLINE' : 'RẠP CHIẾU'}
        </span>

        <h3 className="ticket-movie-title-text">{tkt.movieTitle}</h3>

        <div className="ticket-grid-details">
          <div className="ticket-info-unit">
            <span className="label-text">{isVod ? 'Nền tảng' : 'Rạp Chiếu'}</span>
            <span className="value-text">{tkt.cinema}</span>
          </div>
          <div className="ticket-info-unit">
            <span className="label-text">{isVod ? 'Hình thức' : 'Suất Chiếu'}</span>
            <span className="value-text text-amber-500">
              {isVod ? 'Xem trực tuyến' : formatShowtimeDisplay(tkt.showtime)}
            </span>
          </div>
          {!isVod && (
            <div className="ticket-info-unit">
              <span className="label-text">Đồ ăn & Nước</span>
              <span className="value-text">{tkt.combo}</span>
            </div>
          )}
        </div>

        <div className="ticket-code-row">
          <span className="label-text">Mã vé</span>
          <span className="ticket-code-value">{formatDisplayTicketCode(tkt)}</span>
          {isVod && (
            <span className="ticket-email-hint">Xem mã đầy đủ trong email</span>
          )}
        </div>
      </div>

      <div className="ticket-divider-line-container">
        <div className="dashed-perforation" />
      </div>

      <div className="ticket-body-right">
        <div className="stub-seats-info" onClick={(e) => e.stopPropagation()}>
          <span className="seats-title">{isVod ? 'Loại vé' : 'Ghế'}</span>
          <div className={`seats-numbers${isVod ? ' seats-numbers--static' : ''}`}>
            {isVod ? 'Online' : tkt.seats || '—'}
          </div>
        </div>

        <div className="barcode-wrapper-box">
          <div className="barcode-lines" />
        </div>

        <span className="stub-price-tag">{tkt.price}</span>

        {tkt.cancellable && tkt.bookingUuid && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.(tkt.bookingUuid);
            }}
            className="mt-2 text-[10px] font-bold uppercase tracking-wide text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md cursor-pointer"
          >
            Hủy vé
          </button>
        )}

        {(tkt.status || '').toLowerCase() === 'cancelled' && tkt.bookingUuid && (
          <>
            {(tkt.bookingStatus || '').toUpperCase() === 'REFUND_PENDING' && (
              <span className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-amber-400">
                Chờ admin duyệt hoàn tiền
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRefund?.(tkt.bookingUuid);
              }}
              className="mt-2 text-[10px] font-bold uppercase tracking-wide text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md cursor-pointer"
            >
              Xem hoàn tiền
            </button>
          </>
        )}

        {isVod && isLive && tkt.vodActivated && (
          <span className="mt-2 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
            Đã kích hoạt — không hủy
          </span>
        )}
      </div>
    </div>
  );
};

export default ProfileTicketCard;

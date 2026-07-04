import React from 'react';
import { Printer, QrCode, X } from 'lucide-react';

export const CounterPageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="adm-page-header">
    <div className="adm-page-header__main">
      {eyebrow && <p className="adm-eyebrow">{eyebrow}</p>}
      <h1 className="adm-title">{title}</h1>
      {description && <p className="adm-desc">{description}</p>}
    </div>
    {actions && <div className="adm-page-actions">{actions}</div>}
  </header>
);

export const PrintTicketModal = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="staff-control__welcome-overlay" role="dialog" aria-modal="true">
      <div className="staff-control__welcome-card staff-control__welcome-card--wide">
        <button type="button" onClick={onClose} className="staff-control__modal-close" aria-label="Đóng">
          <X className="w-4 h-4" />
        </button>
        <div className="staff-control__welcome-icon staff-control__welcome-icon--ticket">
          <Printer className="w-7 h-7" />
        </div>
        <h2 className="staff-control__welcome-title">Xuất vé thành công</h2>
        <p className="staff-control__welcome-sub">Vé đã được ghi nhận và sẵn sàng in</p>

        <div className="staff-control__ticket-stub">
          <div className="staff-control__ticket-stub-header">
            <h3>NASA FILM</h3>
            <p>{data.roomName}</p>
            <p>{new Date(data.startTime).toLocaleString('vi-VN')}</p>
          </div>
          <div className="mb-2">
            <span className="staff-control__ticket-label">Tên phim</span>
            <div className="staff-control__ticket-value">{data.movieTitle}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <span className="staff-control__ticket-label">Ghế</span>
              <div className="staff-control__ticket-value staff-control__ticket-value--accent">{data.seats}</div>
            </div>
            <div>
              <span className="staff-control__ticket-label">Thanh toán</span>
              <div className="staff-control__ticket-value">{data.paymentMethod?.replace('COUNTER_', '')}</div>
            </div>
          </div>
          <div className="mb-2">
            <span className="staff-control__ticket-label">Khách hàng</span>
            <div className="staff-control__ticket-value">{data.customerName}</div>
            <div className="text-[0.65rem] text-slate-500">{data.customerEmail}</div>
          </div>
          {data.combos && (
            <div className="mb-2">
              <span className="staff-control__ticket-label">Bắp nước</span>
              <div className="staff-control__ticket-value">{data.combos}</div>
            </div>
          )}
          <div className="staff-control__ticket-qr">
            <QrCode className="w-16 h-16 text-slate-400" />
            <span className="staff-control__ticket-code">{data.tickets?.[0]?.ticketCode || 'TICKET-CODE'}</span>
            <p className="text-[0.58rem] uppercase tracking-wider text-slate-500 m-0">Quét mã để vào phòng chiếu</p>
          </div>
          <div className="staff-control__ticket-total">
            <span>Tổng thanh toán</span>
            <strong>{data.totalPrice?.toLocaleString('vi-VN')}đ</strong>
          </div>
        </div>

        <div className="staff-control__modal-actions">
          <button type="button" className="staff-control__btn staff-control__btn--secondary flex-1" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="staff-control__btn staff-control__btn--primary flex-1" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            In vé ngay
          </button>
        </div>
      </div>
    </div>
  );
};

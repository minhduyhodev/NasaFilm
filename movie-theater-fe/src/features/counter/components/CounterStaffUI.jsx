import { useEffect, useMemo, useState } from 'react';
import { Maximize2, Printer, Ticket, X } from 'lucide-react';
import QRCode from 'qrcode';

export const CounterPageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="adm-page-header">
    <div className="adm-page-header__main">
      {eyebrow && <p className="adm-eyebrow">{eyebrow}</p>}
      <h1 className="adm-title">{title}</h1>
      {description && <p className="adm-desc">{description}</p>}
    </div>
    {actions && <div className="adm-page-actions adm-page-actions--wrap">{actions}</div>}
  </header>
);

const PAYMENT_LABELS = {
  COUNTER_CASH: 'Tiền mặt',
  COUNTER_CARD: 'Thẻ tại quầy',
  COUNTER_VIETQR: 'VietQR',
};

const QR_OPTIONS = {
  width: 280,
  margin: 1,
  errorCorrectionLevel: 'M',
  color: { dark: '#0b1020', light: '#ffffff' },
};

const QR_ZOOM_OPTIONS = {
  ...QR_OPTIONS,
  width: 520,
};

function formatShowtime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function paymentLabel(method) {
  if (!method) return '—';
  return PAYMENT_LABELS[method] || String(method).replace(/^COUNTER_/, '');
}

export const PrintTicketModal = ({ data, onClose }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [qrZoomUrl, setQrZoomUrl] = useState('');
  const [qrZoomOpen, setQrZoomOpen] = useState(false);
  const [qrError, setQrError] = useState(false);

  const ticketCodes = useMemo(() => {
    const fromTickets = (data?.tickets || [])
      .map((t) => t?.ticketCode)
      .filter(Boolean);
    if (fromTickets.length > 0) return fromTickets;
    return data?.ticketCode ? [data.ticketCode] : [];
  }, [data]);

  const primaryCode = ticketCodes[0] || '';

  useEffect(() => {
    let cancelled = false;
    setQrUrl('');
    setQrZoomUrl('');
    setQrError(false);
    setQrZoomOpen(false);

    if (!primaryCode) {
      setQrError(true);
      return undefined;
    }

    (async () => {
      try {
        const [thumb, zoom] = await Promise.all([
          QRCode.toDataURL(String(primaryCode), QR_OPTIONS),
          QRCode.toDataURL(String(primaryCode), QR_ZOOM_OPTIONS),
        ]);
        if (cancelled) return;
        setQrUrl(thumb);
        setQrZoomUrl(zoom);
      } catch {
        if (!cancelled) setQrError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [primaryCode]);

  useEffect(() => {
    if (!qrZoomOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setQrZoomOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qrZoomOpen]);

  if (!data) return null;

  const seats = data.seats || '—';
  const total = Number(data.totalPrice) || 0;

  return (
    <div className="staff-control__welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="pos-ticket-success-title">
      <div className="staff-control__welcome-card staff-control__welcome-card--wide staff-control__welcome-card--ticket">
        <button type="button" onClick={onClose} className="staff-control__modal-close" aria-label="Đóng">
          <X className="w-4 h-4" />
        </button>

        <div className="staff-control__welcome-icon staff-control__welcome-icon--ticket">
          <Printer className="w-7 h-7" />
        </div>
        <h2 id="pos-ticket-success-title" className="staff-control__welcome-title">Xuất vé thành công</h2>
        <p className="staff-control__welcome-sub">Vé đã được ghi nhận và sẵn sàng in</p>

        <div className="staff-control__ticket-stub">
          <div className="staff-control__ticket-stub-notch staff-control__ticket-stub-notch--left" aria-hidden />
          <div className="staff-control__ticket-stub-notch staff-control__ticket-stub-notch--right" aria-hidden />

          <div className="staff-control__ticket-stub-header">
            <div className="staff-control__ticket-brand">
              <Ticket className="w-3.5 h-3.5" aria-hidden />
              <h3>NASA FILM</h3>
            </div>
            <p className="staff-control__ticket-meta">
              <span>{data.roomName || '—'}</span>
              <span className="staff-control__ticket-meta-sep" aria-hidden>·</span>
              <span>{formatShowtime(data.startTime)}</span>
            </p>
          </div>

          <div className="staff-control__ticket-movie">
            {data.moviePoster ? (
              <img
                src={data.moviePoster}
                alt={data.movieTitle || 'Poster phim'}
                className="staff-control__ticket-poster"
              />
            ) : null}
            <div className="staff-control__ticket-movie-copy">
              <span className="staff-control__ticket-label">Tên phim</span>
              <div className="staff-control__ticket-value staff-control__ticket-value--title">{data.movieTitle}</div>
            </div>
          </div>

          <div className="staff-control__ticket-grid">
            <div>
              <span className="staff-control__ticket-label">Ghế</span>
              <div className="staff-control__ticket-value staff-control__ticket-value--accent">{seats}</div>
            </div>
            <div>
              <span className="staff-control__ticket-label">Thanh toán</span>
              <div className="staff-control__ticket-value">{paymentLabel(data.paymentMethod)}</div>
            </div>
          </div>

          <div className="staff-control__ticket-customer">
            <span className="staff-control__ticket-label">Khách hàng</span>
            <div className="staff-control__ticket-value">{data.customerName || '—'}</div>
            {data.customerEmail && (
              <div className="staff-control__ticket-email">{data.customerEmail}</div>
            )}
          </div>

          {data.combos ? (
            <div className="staff-control__ticket-combos">
              <span className="staff-control__ticket-label">Bắp nước</span>
              <div className="staff-control__ticket-value">{data.combos}</div>
            </div>
          ) : null}

          <div className="staff-control__ticket-qr">
            {qrUrl ? (
              <button
                type="button"
                className="staff-control__ticket-qr-btn"
                onClick={() => setQrZoomOpen(true)}
                title="Phóng to mã QR"
                aria-label="Phóng to mã QR để quét"
              >
                <img src={qrUrl} alt={`Mã QR vé ${primaryCode}`} className="staff-control__ticket-qr-img" />
                <span className="staff-control__ticket-qr-hint">
                  <Maximize2 className="w-3 h-3" aria-hidden />
                  Bấm để phóng to
                </span>
              </button>
            ) : (
              <div className="staff-control__ticket-qr-fallback" aria-hidden>
                <Ticket className="w-10 h-10" />
                <span>{qrError ? 'Không tạo được mã QR' : 'Đang tạo mã QR…'}</span>
              </div>
            )}

            <span className="staff-control__ticket-code">{primaryCode || '—'}</span>
            {ticketCodes.length > 1 && (
              <div className="staff-control__ticket-code-list">
                {ticketCodes.slice(1).map((code) => (
                  <span key={code} className="staff-control__ticket-code-chip">{code}</span>
                ))}
              </div>
            )}
            <p className="staff-control__ticket-qr-caption">Quét mã để vào phòng chiếu</p>
          </div>

          <div className="staff-control__ticket-total">
            <span>Tổng thanh toán</span>
            <strong>{total.toLocaleString('vi-VN')}đ</strong>
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

      {qrZoomOpen && qrZoomUrl && (
        <div
          className="staff-control__qr-zoom"
          role="dialog"
          aria-modal="true"
          aria-label="Mã QR phóng to"
          onClick={() => setQrZoomOpen(false)}
        >
          <div
            className="staff-control__qr-zoom-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="staff-control__qr-zoom-close"
              onClick={() => setQrZoomOpen(false)}
              aria-label="Đóng phóng to"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="staff-control__qr-zoom-title">Mã vào phòng chiếu</p>
            <p className="staff-control__qr-zoom-movie">{data.movieTitle}</p>
            <img src={qrZoomUrl} alt={`Mã QR phóng to ${primaryCode}`} className="staff-control__qr-zoom-img" />
            <p className="staff-control__qr-zoom-code">{primaryCode}</p>
            <p className="staff-control__qr-zoom-hint">Đưa màn hình về phía máy soát vé · Esc hoặc bấm ngoài để đóng</p>
          </div>
        </div>
      )}
    </div>
  );
};

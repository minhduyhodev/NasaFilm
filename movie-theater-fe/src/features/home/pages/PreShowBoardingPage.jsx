import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Maximize2, Printer, X } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBoardingPass } from '../../../shared/hooks/queries/usePreShowQueries';
import { notificationService } from '../../../shared/services/notificationService';
import { formatCountdown, getMovieGlowClass } from '../utils/preShowUtils';
import { maskTicketCode } from '../utils/movieUtils';
import './PreShowBoardingPage.css';

const QR_OPTIONS = {
  width: 480,
  margin: 2,
  errorCorrectionLevel: 'H',
};

const PreShowBoardingPage = () => {
  const { bookingUuid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const justConfirmed = Boolean(location.state?.justConfirmed);
  const { data: pass, isLoading, isError, error } = useBoardingPass(bookingUuid);
  const [countdown, setCountdown] = useState('00:00:00');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isError) {
      notificationService.error(error?.message || 'Không thể tải thẻ lên máy bay');
      navigate('/profile', { replace: true });
    }
  }, [isError, error, navigate]);

  useEffect(() => {
    if (!pass?.showtimeStart) return undefined;
    const update = () => setCountdown(formatCountdown(pass.showtimeStart));
    update();
    const timerId = window.setInterval(update, 1000);
    return () => window.clearInterval(timerId);
  }, [pass?.showtimeStart]);

  useEffect(() => {
    const qrData = pass?.qrData;
    if (!qrData) {
      setQrDataUrl('');
      return undefined;
    }

    let cancelled = false;
    QRCode.toDataURL(qrData, QR_OPTIONS)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [pass?.qrData]);

  const handleBack = () => {
    if (justConfirmed) {
      navigate('/movies');
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/profile');
  };

  const handleOpenMaps = () => {
    if (!pass?.mapsUrl) {
      notificationService.warning('Chưa có liên kết dẫn đường cho trạm phóng này');
      return;
    }
    window.open(pass.mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    if (!qrDataUrl) {
      notificationService.warning('Mã QR đang tải, vui lòng đợi vài giây rồi thử lại.');
      return;
    }
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !pass?.primaryTicketCode) {
      notificationService.warning('Mã QR đang tải, vui lòng đợi vài giây rồi thử lại.');
      return;
    }
    const link = document.createElement('a');
    link.download = `NASAFilm-QR-${pass.missionCode || 've'}.png`;
    link.href = qrDataUrl;
    link.click();
    notificationService.success('Đã tải ảnh QR — in hoặc đưa staff quét trực tiếp trên điện thoại.');
  };

  const handleCopyTicketCode = async () => {
    const code = pass?.primaryTicketCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      notificationService.success('Đã copy mã vé — dán vào ô soát vé nếu không quét được QR.');
    } catch {
      notificationService.error('Không copy được. Bấm "Hiện mã đầy đủ" và nhập thủ công.');
    }
  };

  if (isLoading || !pass) {
    return (
      <div className="pre-show-page">
        <div className="pre-show-page__cosmos" aria-hidden="true" />
        <div className="pre-show-page__inner">
          <div className="pre-show-page__loading">Đang chuẩn bị thẻ lên máy bay...</div>
        </div>
      </div>
    );
  }

  const glowClass = getMovieGlowClass(pass.movieTitle);
  const showCountdown = ['PREPARE', 'SOON', 'BOARDING'].includes(pass.ritualStatus);
  const bookingId = `#CL-${String(pass.bookingUuid || bookingUuid).substring(0, 8).toUpperCase()}`;
  const cinemaLine = [pass.launchPadName, pass.chamberLabel].filter(Boolean).join(' • ');

  return (
    <div className="pre-show-page">
      <div className="pre-show-page__cosmos" aria-hidden="true" />

      <div className="pre-show-page__inner">
        <nav className="pre-show-page__nav no-print">
          <button type="button" className="pre-show-page__back" onClick={handleBack}>
            Quay lại
          </button>
          <span className="pre-show-page__nav-label">Thẻ lên máy bay</span>
          <button type="button" className="pre-show-page__close" onClick={handleBack} aria-label="Đóng">
            <X size={16} />
          </button>
        </nav>

        {justConfirmed && (
          <div className="pre-show-page__success no-print">
            <div>
              <p className="pre-show-page__success-eyebrow">Nhiệm vụ điện ảnh đã xác nhận</p>
              <h1 className="pre-show-page__success-title">Đặt vé thành công</h1>
              <p className="pre-show-page__success-copy">
                Giữ thẻ vé NASA Film bên dưới — xuất trình mã QR tại cổng soát vé trước giờ cất cánh.
              </p>
            </div>
          </div>
        )}

        <div className={`cine-ticket ${glowClass} pre-show-boarding__screen`}>
          <span className="cine-ticket__notch cine-ticket__notch--tl" aria-hidden="true" />
          <span className="cine-ticket__notch cine-ticket__notch--tr" aria-hidden="true" />
          <span className="cine-ticket__notch cine-ticket__notch--bl" aria-hidden="true" />
          <span className="cine-ticket__notch cine-ticket__notch--br" aria-hidden="true" />

          <div className="cine-ticket__ribbon">
            <span className="cine-ticket__ribbon-left">NASA Film · Vé rạp chiếu</span>
            <span className="cine-ticket__ribbon-right">Hợp lệ</span>
          </div>

          <header className="cine-ticket__header">
            <div className="cine-ticket__brand-block">
              <p className="cine-ticket__brand">THẺ LÊN MÁY BAY</p>
              <p className="cine-ticket__mission">{pass.missionCode}</p>
            </div>
            <div className="cine-ticket__badges">
              <span className={`cine-ticket__status cine-ticket__status--${(pass.ritualStatus || '').toLowerCase()}`}>
                {pass.ritualStatusLabel}
              </span>
              {pass.checkedIn && <span className="cine-ticket__badge cine-ticket__badge--ok">Đã soát vé</span>}
              {pass.memberTierBadge && <span className="cine-ticket__badge cine-ticket__badge--tier">{pass.memberTierBadge}</span>}
            </div>
          </header>

          <div className="cine-ticket__body">
            <section className="cine-ticket__cinema">
              {pass.posterUrl ? (
                <img src={pass.posterUrl} alt={pass.movieTitle} className="cine-ticket__poster" />
              ) : (
                <div className="cine-ticket__poster cine-ticket__poster--fallback" />
              )}
              {showCountdown && (
                <div className="cine-ticket__countdown">
                  <span className="cine-ticket__countdown-label">Cửa sổ cất cánh còn</span>
                  <span className="cine-ticket__countdown-value">{countdown}</span>
                </div>
              )}
            </section>

            <section className="cine-ticket__mission-panel">
              <h2 className="cine-ticket__title">{pass.movieTitle}</h2>

              <div className="cine-ticket__grid">
                <div className="cine-ticket__cell">
                  <span className="cine-ticket__label">Cửa sổ cất cánh</span>
                  <span className="cine-ticket__value">{pass.showtimeDisplay}</span>
                </div>
                <div className="cine-ticket__cell">
                  <span className="cine-ticket__label">Trạm phóng</span>
                  <span className="cine-ticket__value">{pass.launchPadName}</span>
                </div>
                <div className="cine-ticket__cell">
                  <span className="cine-ticket__label">Buồng chiếu</span>
                  <span className="cine-ticket__value">{pass.chamberLabel}</span>
                </div>
                <div className="cine-ticket__cell cine-ticket__cell--highlight">
                  <span className="cine-ticket__label">Vị trí phi hành đoàn</span>
                  <span className="cine-ticket__value cine-ticket__value--gold">{pass.crewAssignment}</span>
                </div>
              </div>

              {pass.entranceNote && (
                <div className="cine-ticket__entrance">
                  <span className="cine-ticket__label">Hướng dẫn vào cổng</span>
                  <p>{pass.entranceNote}</p>
                </div>
              )}
            </section>

            <section className="cine-ticket__stub">
              <span className="cine-ticket__stub-notch cine-ticket__stub-notch--top" aria-hidden="true" />
              <span className="cine-ticket__stub-notch cine-ticket__stub-notch--bottom" aria-hidden="true" />

              <div className="cine-ticket__stub-inner">
                <p className="cine-ticket__stub-label">Soát vé</p>
                {qrDataUrl ? (
                  <button
                    type="button"
                    className="cine-ticket__qr-btn no-print"
                    onClick={() => setQrFullscreen(true)}
                    title="Phóng to QR cho staff quét"
                  >
                    <img src={qrDataUrl} alt="Mã QR soát vé" className="cine-ticket__qr" />
                    <span className="cine-ticket__qr-tap-hint">
                      <Maximize2 className="w-3 h-3 inline" /> Chạm để phóng to
                    </span>
                  </button>
                ) : (
                  <div className="cine-ticket__qr cine-ticket__qr--loading">Đang tải QR...</div>
                )}
                <div className="cine-ticket__barcode" aria-hidden="true" />
                <p className="cine-ticket__code">
                  {codeRevealed ? pass.primaryTicketCode : maskTicketCode(pass.primaryTicketCode)}
                </p>
                <button
                  type="button"
                  className="cine-ticket__reveal-code no-print"
                  onClick={() => setCodeRevealed((v) => !v)}
                >
                  {codeRevealed ? 'Ẩn mã' : 'Hiện mã đầy đủ'}
                </button>
                <p className="cine-ticket__scan-tip no-print">
                  Đưa màn hình này cho staff quét trực tiếp — không cần chụp ảnh lại.
                </p>
              </div>
            </section>
          </div>

          <footer className="cine-ticket__actions no-print">
            <button type="button" className="cine-ticket__btn cine-ticket__btn--primary" onClick={handleOpenMaps}>
              Dẫn đường đến bệ phóng
            </button>
            <button type="button" className="cine-ticket__btn cine-ticket__btn--ghost" onClick={() => setQrFullscreen(true)}>
              <Maximize2 className="w-4 h-4" />
              Phóng to QR
            </button>
            <button type="button" className="cine-ticket__btn cine-ticket__btn--ghost" onClick={handleDownloadQr}>
              <Download className="w-4 h-4" />
              Tải QR
            </button>
            <button type="button" className="cine-ticket__btn cine-ticket__btn--ghost" onClick={handleCopyTicketCode}>
              <Copy className="w-4 h-4" />
              Copy mã vé
            </button>
            <button type="button" className="cine-ticket__btn cine-ticket__btn--ghost" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              In vé
            </button>
          </footer>
        </div>

        {qrFullscreen && qrDataUrl && (
          <div className="boarding-qr-overlay no-print" role="dialog" aria-modal="true">
            <div className="boarding-qr-overlay__card">
              <button
                type="button"
                className="boarding-qr-overlay__close"
                onClick={() => setQrFullscreen(false)}
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
              <p className="boarding-qr-overlay__title">Mã QR soát vé</p>
              <p className="boarding-qr-overlay__movie">{pass.movieTitle}</p>
              <img src={qrDataUrl} alt="Mã QR soát vé phóng to" className="boarding-qr-overlay__qr" />
              <p className="boarding-qr-overlay__code">{pass.primaryTicketCode}</p>
              <p className="boarding-qr-overlay__hint">
                Staff quét trực tiếp trên màn hình điện thoại — độ sáng tối đa, không chụp lại.
              </p>
              <div className="boarding-qr-overlay__actions">
                <button type="button" className="cine-ticket__btn cine-ticket__btn--ghost" onClick={handleDownloadQr}>
                  Tải ảnh QR
                </button>
                <button type="button" className="cine-ticket__btn cine-ticket__btn--primary" onClick={handleCopyTicketCode}>
                  Copy mã vé
                </button>
              </div>
            </div>
          </div>
        )}

        <article className="pre-show-boarding__print-ticket" aria-hidden="true">
          <div className="print-ticket">
            {pass.posterUrl ? (
              <img src={pass.posterUrl} alt="" className="print-ticket__poster" />
            ) : (
              <div className="print-ticket__poster print-ticket__poster--fallback" />
            )}

            <div className="print-ticket__body">
              <p className="print-ticket__eyebrow">NASA Film · Trải nghiệm thượng lưu</p>
              <h1 className="print-ticket__title">Đặt vé thành công</h1>
              <p className="print-ticket__subtitle">
                Hành trình điện ảnh của bạn đã sẵn sàng. Chào mừng bạn đến với suất chiếu.
              </p>

              <div className="print-ticket__grid">
                <div className="print-ticket__field">
                  <span className="print-ticket__label">Phim</span>
                  <span className="print-ticket__value">{pass.movieTitle}</span>
                </div>
                <div className="print-ticket__field">
                  <span className="print-ticket__label">Thời gian</span>
                  <span className="print-ticket__value">{pass.showtimeDisplay}</span>
                </div>
                <div className="print-ticket__field">
                  <span className="print-ticket__label">Rạp &amp; phòng chiếu</span>
                  <span className="print-ticket__value">{cinemaLine}</span>
                </div>
                <div className="print-ticket__field">
                  <span className="print-ticket__label">Ghế đã đặt</span>
                  <span className="print-ticket__value print-ticket__value--accent">{pass.crewAssignment}</span>
                </div>
              </div>

              <div className="print-ticket__qr-box">
                {qrDataUrl && <img src={qrDataUrl} alt="" className="print-ticket__qr" />}
                <div className="print-ticket__codes">
                  <p><strong>Mã nhiệm vụ:</strong> {pass.missionCode}</p>
                  <p><strong>Mã vé:</strong> {pass.primaryTicketCode}</p>
                  <p><strong>Mã đơn:</strong> {bookingId}</p>
                  <p className="print-ticket__full-code">
                    <strong>Mã vé đầy đủ (in):</strong> {pass.primaryTicketCode}
                  </p>
                  <p className="print-ticket__hint">
                    Xuất trình mã QR tại lối vào VIP để soát vé vào phòng chiếu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default PreShowBoardingPage;

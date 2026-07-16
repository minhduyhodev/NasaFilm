import React from 'react';
import {
  Camera,
  CameraOff,
  ClipboardList,
  Loader2,
  QrCode,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import StaffQrScanner, { canUseQrScanner } from '../../../../shared/components/qr/StaffQrScanner';
import { adminInputClass } from '../../components/adminFormStyles';
import StaffCheckInSessionHistory from './StaffCheckInSessionHistory';

export const StaffTicketCheckInForm = ({
  ticketCode,
  setTicketCode,
  ticketPreview,
  previewLoading,
  previewError,
  checkingIn,
  scanning,
  scannerError,
  onQrScan,
  onScannerError,
  onToggleScanner,
  onCheckIn,
  showCameraPlaceholder = true,
}) => {
  const qrScannerAvailable = canUseQrScanner();

  return (
    <aside className="staff-control__panel staff-control__panel--checkin">
      <h2 className="staff-control__panel-title">
        <Scan className="w-3.5 h-3.5" />
        Soát vé QR
      </h2>

      {showCameraPlaceholder && !scanning && (
        <div
          role="button"
          tabIndex={0}
          onClick={qrScannerAvailable ? onToggleScanner : undefined}
          onKeyDown={(e) => e.key === 'Enter' && qrScannerAvailable && onToggleScanner()}
          className={`staff-control__scan-placeholder ${!qrScannerAvailable ? 'staff-control__scan-placeholder--disabled' : ''}`}
        >
          <div className="staff-control__scan-placeholder-icon">
            <QrCode className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-300">
            {qrScannerAvailable ? 'Nhấp để kích hoạt camera' : 'Camera không khả dụng'}
          </p>
          <p className="text-[0.65rem] text-slate-500 mt-1">
            {qrScannerAvailable
              ? 'Yêu cầu cấp quyền truy cập camera'
              : 'Cần HTTPS hoặc localhost — nhập mã thủ công'}
          </p>
        </div>
      )}

      <StaffQrScanner active={scanning} onScan={onQrScan} onError={onScannerError} />

      {scannerError && <p className="staff-control__scanner-error">{scannerError}</p>}

      {scanning && (
        <button
          type="button"
          className="staff-control__btn staff-control__btn--secondary w-full mb-3"
          onClick={onToggleScanner}
        >
          <CameraOff className="w-4 h-4" />
          Tắt camera
        </button>
      )}

      <div className="staff-control__checkin-divider">Hoặc nhập mã thủ công</div>

      <form className="staff-control__checkin-form" onSubmit={onCheckIn}>
        <input
          type="text"
          className={adminInputClass}
          placeholder="Nhập hoặc quét mã vé..."
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />

        {previewLoading && (
          <p className="text-[0.65rem] text-slate-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tra cứu vé...
          </p>
        )}

        {previewError && !previewLoading && (
          <p className="text-[0.65rem] text-red-400">{previewError}</p>
        )}

        {ticketPreview && !previewLoading && (
          <div className="staff-control__preview-card">
            <p className="staff-control__preview-title">
              {ticketPreview.alreadyCheckedIn ? 'Vé đã soát' : 'Thông tin vé'}
            </p>
            <p><strong>{ticketPreview.customerName}</strong></p>
            <p>{ticketPreview.movieTitle}</p>
            <p>{ticketPreview.showtimeDisplay || '—'}</p>
            <p>Ghế: {(ticketPreview.seatLabels || []).join(', ') || '—'}</p>
            {ticketPreview.alreadyCheckedIn && (
              <p className="staff-control__preview-warn">Vé này đã được check-in trước đó.</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!showCameraPlaceholder && (
            <button
              type="button"
              className="staff-control__btn staff-control__btn--secondary flex-1"
              onClick={onToggleScanner}
              disabled={!qrScannerAvailable}
            >
              {scanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {scanning ? 'Tắt' : 'Quét QR'}
            </button>
          )}
          <button
            type="submit"
            className="staff-control__btn staff-control__btn--primary flex-1"
            disabled={checkingIn || !ticketCode.trim() || previewLoading || Boolean(previewError)}
          >
            {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
            {checkingIn ? 'Đang soát...' : 'Kiểm tra & Soát vé'}
          </button>
        </div>
      </form>
    </aside>
  );
};

export const StaffTicketScanResult = ({ result, loading = false, active = false }) => (
  <section className={`staff-control__panel staff-control__panel--scan-result ${active ? 'staff-control__panel--live' : ''}`}>
    {loading ? (
      <div className="staff-control__scan-result-body staff-control__scan-result-body--loading">
        <Loader2 className="w-8 h-8 animate-spin text-red-400 mx-auto mb-3" />
        <p className="staff-control__empty">Đang tra cứu thông tin vé...</p>
      </div>
    ) : result ? (
      <div className="staff-control__scan-result-body">
        <div className={`staff-control__result-banner ${
          result.status === 'VALID'
            ? 'staff-control__result-banner--success'
            : result.status === 'PREVIEW'
              ? 'staff-control__result-banner--preview'
              : 'staff-control__result-banner--error'
        }`}>
          {result.status === 'VALID' ? (
            <ShieldCheck className="w-5 h-5 shrink-0" />
          ) : result.status === 'PREVIEW' ? (
            <Scan className="w-5 h-5 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 shrink-0" />
          )}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">
              {result.status === 'VALID' && 'VÉ HỢP LỆ'}
              {result.status === 'PREVIEW' && 'ĐÃ NHẬN DIỆN VÉ'}
              {result.status === 'ALREADY_USED' && 'VÉ ĐÃ SOÁT'}
              {result.status === 'ERROR' && 'LỖI SOÁT VÉ'}
            </h3>
            <p className="text-xs mt-1 opacity-90">{result.message}</p>
          </div>
        </div>

        <div className="staff-control__result-details">
          <div>
            <span className="staff-control__result-label">Phim chiếu</span>
            <span className="staff-control__result-value">{result.movieTitle}</span>
          </div>
          <div>
            <span className="staff-control__result-label">Phòng chiếu</span>
            <span className="staff-control__result-value">{result.cinemaName} · {result.roomName}</span>
          </div>
          <div>
            <span className="staff-control__result-label">Vị trí ghế</span>
            <span className="staff-control__result-value staff-control__result-value--accent">{result.seats}</span>
          </div>
          <div>
            <span className="staff-control__result-label">Mã vé</span>
            <span className="staff-control__result-value font-mono">{result.code}</span>
          </div>
          <div>
            <span className="staff-control__result-label">Tên khách hàng</span>
            <span className="staff-control__result-value">{result.customerName}</span>
          </div>
          <div>
            <span className="staff-control__result-label">Suất chiếu</span>
            <span className="staff-control__result-value">{result.showtimeDisplay}</span>
          </div>
        </div>

        <div className="staff-control__scan-result-footer">
          <span>
            {result.status === 'PREVIEW'
              ? 'Chờ xác nhận soát vé'
              : `Thời gian quét: ${new Date(result.checkedInAt).toLocaleTimeString('vi-VN')}`}
          </span>
        </div>
      </div>
    ) : (
      <div className="staff-control__empty staff-control__scan-result-empty">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Chưa có thông tin quét vé</p>
        <p className="text-[0.7rem] mt-1 max-w-[280px] mx-auto">
          Quét mã QR hoặc nhập mã vé để hiển thị thông tin chi tiết
        </p>
      </div>
    )}
  </section>
);

const StaffTicketCheckInPanel = ({
  checkIn,
  showResult = true,
  showHistory = true,
  showCameraPlaceholder = true,
}) => (
  <>
    <StaffTicketCheckInForm
      showCameraPlaceholder={showCameraPlaceholder}
      {...checkIn}
    />
    {showResult && (
      <StaffTicketScanResult
        result={checkIn.displayResult}
        loading={checkIn.previewLoading && checkIn.ticketCode.trim().length >= 4}
        active={checkIn.isResultPanelActive}
      />
    )}
    {showHistory && (
      <StaffCheckInSessionHistory items={checkIn.scanHistory} active={checkIn.isHistoryActive} />
    )}
  </>
);

export default StaffTicketCheckInPanel;

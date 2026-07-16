import { useCallback, useEffect, useRef, useState } from 'react';
import { staffMissionService } from '../../api/staffMissionService';
import { playCheckInBeep, speakCheckInText } from './staffCheckInAudio';
import { confirmAction } from '../../../../shared/utils/confirmDialog';

const SESSION_HISTORY_KEY = 'staff_checkin_session_history';

const buildScanResult = (data, code, message, isError = false) => ({
  code: data?.ticketCode || code,
  status: isError ? 'ERROR' : (data?.alreadyCheckedIn ? 'ALREADY_USED' : 'VALID'),
  message: message || (data?.alreadyCheckedIn ? 'Vé đã được soát trước đó' : 'Soát vé thành công'),
  checkedInAt: data?.checkedInAt || new Date().toISOString(),
  movieTitle: data?.movieTitle || '—',
  cinemaName: data?.cinemaName || '—',
  roomName: data?.roomName || '—',
  customerName: data?.customerName || '—',
  seats: (data?.seatLabels || []).join(', ') || '—',
  showtimeDisplay: data?.showtimeDisplay || '—',
  showtimeUuid: data?.showtimeUuid || null,
  isPreview: false,
});

export const previewToScanResult = (preview, code) => ({
  code: preview?.ticketCode || code,
  status: preview?.alreadyCheckedIn ? 'ALREADY_USED' : 'PREVIEW',
  message: preview?.alreadyCheckedIn
    ? 'Vé đã được soát trước đó'
    : 'Đã nhận diện vé — nhấn "Kiểm tra & Soát vé" để xác nhận',
  checkedInAt: new Date().toISOString(),
  movieTitle: preview?.movieTitle || '—',
  cinemaName: preview?.cinemaName || '—',
  roomName: preview?.roomName || '—',
  customerName: preview?.customerName || '—',
  seats: (preview?.seatLabels || []).join(', ') || '—',
  showtimeDisplay: preview?.showtimeDisplay || '—',
  showtimeUuid: preview?.showtimeUuid || null,
  isPreview: true,
});

const buildSpeechMessage = (result) => {
  if (result.status === 'VALID') {
    const seats = result.seats && result.seats !== '—' ? ` Ghế ${result.seats}` : '';
    return `Soát vé thành công!${seats}`;
  }
  if (result.status === 'ALREADY_USED') return 'Vé đã sử dụng!';
  return result.message || 'Có lỗi xảy ra';
};

export const useStaffTicketCheckIn = ({ audioEnabled = true, onCheckInComplete, gateShowtimeUuid = null } = {}) => {
  const [ticketCode, setTicketCode] = useState('');
  const [ticketPreview, setTicketPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const scanSourceRef = useRef('manual');
  const pendingAutoCheckInRef = useRef(false);
  const handleCheckInRef = useRef(null);

  const pushHistory = useCallback((result) => {
    setScanHistory((prev) => [
      {
        code: result.code,
        movieTitle: result.movieTitle,
        seats: result.seats,
        checkedInAt: result.checkedInAt,
        status: result.status === 'ERROR' ? 'ERROR' : result.status,
        message: result.message,
      },
      ...prev.slice(0, 19),
    ]);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(scanHistory));
    } catch {
      /* sessionStorage optional */
    }
  }, [scanHistory]);

  const handleQrScan = useCallback((code) => {
    scanSourceRef.current = 'camera';
    pendingAutoCheckInRef.current = true;
    setTicketCode(code);
    setScannerError('');
  }, []);

  const handleScannerError = useCallback((message) => {
    setScannerError(message);
    setScanning(false);
  }, []);

  const toggleScanner = useCallback(() => {
    setScanning((prev) => {
      if (prev) setScannerError('');
      return !prev;
    });
  }, []);

  useEffect(() => {
    const code = ticketCode.trim();
    if (!code || code.length < 4) {
      setTicketPreview(null);
      setPreviewError('');
      return undefined;
    }

    let cancelled = false;
    const fromCamera = scanSourceRef.current === 'camera';
    scanSourceRef.current = 'manual';
    const delay = fromCamera ? 0 : 350;

    const timerId = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError('');
      const scanSource = fromCamera ? 'CAMERA' : 'MANUAL';
      try {
        const data = await staffMissionService.previewTicket(code, scanSource);
        if (!cancelled) setTicketPreview(data);
      } catch (err) {
        if (!cancelled) {
          setTicketPreview(null);
          setPreviewError(err?.message || 'Không tìm thấy vé');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [ticketCode]);

  useEffect(() => {
    if (!pendingAutoCheckInRef.current || previewLoading || previewError || !ticketPreview) return;
    if (checkingIn) return;
    pendingAutoCheckInRef.current = false;
    if (!ticketPreview.alreadyCheckedIn) {
      handleCheckInRef.current?.();
    }
  }, [ticketPreview, previewLoading, previewError, checkingIn]);

  const handleCheckIn = useCallback(async (event) => {
    event?.preventDefault?.();
    const code = ticketCode.trim();
    if (!code) return;

    // Chỉ xác nhận khi nhân viên bấm nút thủ công — QR auto-check-in giữ tốc độ tại cổng.
    if (event) {
      const preview = ticketPreview;
      const ok = await confirmAction({
        title: 'Xác nhận soát vé',
        message: 'Sau khi soát, vé sẽ được đánh dấu đã vào cổng và không thể hoàn tác.',
        highlight: code,
        detail: preview
          ? `${preview.movieTitle || '—'} · Ghế ${(preview.seatLabels || []).join(', ') || '—'}`
          : '',
        confirmLabel: 'Soát vé',
        variant: 'warning',
      });
      if (!ok) return;
    }

    setCheckingIn(true);
    const scanSource = scanSourceRef.current === 'camera' ? 'CAMERA' : 'MANUAL';
    try {
      const { data, message } = await staffMissionService.checkInTicket(code, scanSource, gateShowtimeUuid);
      const result = buildScanResult(data, code, message);
      const isSuccess = result.status === 'VALID';
      playCheckInBeep(isSuccess);
      speakCheckInText(buildSpeechMessage(result), audioEnabled);
      setLastScanResult(result);
      pushHistory(result);
      onCheckInComplete?.(data, result);
      setTicketCode('');
      setTicketPreview(null);
      setPreviewError('');
      setScanning(false);
    } catch (error) {
      const errMsg = error?.message || 'Không thể soát vé';
      const result = buildScanResult(null, code, errMsg, true);
      playCheckInBeep(false);
      speakCheckInText(errMsg, audioEnabled);
      setLastScanResult(result);
      pushHistory(result);
    } finally {
      setCheckingIn(false);
    }
  }, [audioEnabled, onCheckInComplete, pushHistory, ticketCode, ticketPreview, gateShowtimeUuid]);

  handleCheckInRef.current = handleCheckIn;

  const code = ticketCode.trim();
  const displayResult = (() => {
    if (code.length >= 4 && previewLoading) return null;
    if (code.length >= 4 && previewError) {
      return buildScanResult(null, code, previewError, true);
    }
    if (code.length >= 4 && ticketPreview) {
      return previewToScanResult(ticketPreview, code);
    }
    return lastScanResult;
  })();

  const isResultPanelActive = Boolean(displayResult) || (code.length >= 4 && previewLoading);
  const isHistoryActive = scanHistory.length > 0;

  return {
    ticketCode,
    setTicketCode,
    ticketPreview,
    previewLoading,
    previewError,
    checkingIn,
    scanning,
    scannerError,
    lastScanResult,
    displayResult,
    scanHistory,
    isResultPanelActive,
    isHistoryActive,
    handleQrScan,
    handleScannerError,
    toggleScanner,
    handleCheckIn,
  };
};

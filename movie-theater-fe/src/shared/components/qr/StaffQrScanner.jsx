import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ImageUp } from 'lucide-react';
import './StaffQrScanner.css';

const SCAN_COOLDOWN_MS = 3500;
const SCAN_INTERVAL_MS = 45;
const DECODE_MAX_WIDTH = 800;

const VIRTUAL_CAMERA_PATTERN = /obs|virtual|snap camera|manycam|xsplit|camo|epoc cam|iriun|droidcam|ndi|avatar|broadcast|mirror|screen capture|display/i;

const isVirtualCamera = (label = '') => VIRTUAL_CAMERA_PATTERN.test(label);

const isPhysicalWebcam = (label = '') =>
  /usb|uvc|webcam|integrated|hd camera|facetime|logitech|c920|c922|camera/i.test(label);

/** Chuẩn hóa nội dung QR → mã vé TK... */
export const extractTicketCodeFromScan = (rawValue) => {
  const value = (rawValue || '').trim();
  if (!value) return '';

  if (/^TK[A-Z0-9]+$/i.test(value)) {
    return value.toUpperCase();
  }

  const tkMatch = value.match(/TK[A-Z0-9]{10,}/i);
  if (tkMatch) {
    return tkMatch[0].toUpperCase();
  }

  try {
    const url = new URL(value);
    const fromQuery = url.searchParams.get('ticket')
      || url.searchParams.get('code')
      || url.searchParams.get('ticketCode');
    if (fromQuery) {
      return extractTicketCodeFromScan(fromQuery);
    }
  } catch {
    /* not a URL */
  }

  return value;
};

export const filterPhysicalCameras = (cameras) =>
  (cameras || []).filter((camera) => !isVirtualCamera(camera.label || ''));

export const pickBestCamera = (cameras) => {
  const pool = filterPhysicalCameras(cameras);
  if (!pool.length) return null;

  const rear = pool.find((camera) => /back|rear|environment|sau/i.test(camera.label || ''));
  if (rear) return rear;

  const webcam = pool.find((camera) => isPhysicalWebcam(camera.label || ''));
  if (webcam) return webcam;

  return pool[0];
};

const stopMediaStream = (stream) => {
  stream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch {
      /* track may already be stopped */
    }
  });
};

const listPhysicalCameras = async () => {
  let tempStream = null;
  try {
    tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (err) {
    throw err;
  } finally {
    stopMediaStream(tempStream);
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device) => ({
      id: device.deviceId,
      label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
    }));
};

const openCameraStream = async (deviceId) => {
  const attempts = [
    {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 },
      },
      audio: false,
    },
    {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    },
    {
      video: { deviceId: { exact: deviceId } },
      audio: false,
    },
  ];

  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Không mở được camera');
};

const decodeWithJsQr = (imageData, width, height) => {
  const result = jsQR(imageData, width, height, { inversionAttempts: 'attemptBoth' });
  return result?.data || null;
};

const decodeBinarized = (imageData, width, height) => {
  const copy = new Uint8ClampedArray(imageData);
  for (let i = 0; i < copy.length; i += 4) {
    const avg = (copy[i] + copy[i + 1] + copy[i + 2]) / 3;
    const v = avg > 135 ? 255 : 0;
    copy[i] = v;
    copy[i + 1] = v;
    copy[i + 2] = v;
  }
  return decodeWithJsQr(copy, width, height);
};

const decodeFromImageData = (imageData, width, height) => {
  const direct = decodeWithJsQr(imageData, width, height);
  if (direct) return direct;
  return decodeBinarized(imageData, width, height);
};

const decodeVideoFrame = async (video, canvas, ctx, detector) => {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = Math.min(1, DECODE_MAX_WIDTH / vw);
  const w = Math.max(1, Math.floor(vw * scale));
  const h = Math.max(1, Math.floor(vh * scale));

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  if (detector) {
    try {
      const codes = await detector.detect(canvas);
      if (codes?.length) return codes[0].rawValue;
    } catch {
      /* BarcodeDetector may fail on some frames */
    }
  }

  const fullFrame = ctx.getImageData(0, 0, w, h);
  const fromFull = decodeFromImageData(fullFrame.data, w, h);
  if (fromFull) return fromFull;

  const cropW = Math.floor(w * 0.88);
  const cropH = Math.floor(h * 0.88);
  const sx = Math.floor((w - cropW) / 2);
  const sy = Math.floor((h - cropH) / 2);

  canvas.width = cropW;
  canvas.height = cropH;
  ctx.drawImage(video, sx / scale, sy / scale, cropW / scale, cropH / scale, 0, 0, cropW, cropH);

  const cropped = ctx.getImageData(0, 0, cropW, cropH);
  return decodeFromImageData(cropped.data, cropW, cropH);
};

const decodeImageFile = async (file) => {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const scale = Math.min(1, DECODE_MAX_WIDTH / bitmap.width);
  canvas.width = Math.max(1, Math.floor(bitmap.width * scale));
  canvas.height = Math.max(1, Math.floor(bitmap.height * scale));
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeFromImageData(imageData.data, canvas.width, canvas.height);
};

const StaffQrScanner = ({ active, onScan, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(0);
  const detectorRef = useRef(null);
  const decodingRef = useRef(false);
  const fileInputRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const lastScanRef = useRef({ code: '', at: 0 });
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanHint, setScanHint] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  const emitScan = useCallback((rawValue) => {
    const ticketCode = extractTicketCodeFromScan(rawValue);
    if (!ticketCode || ticketCode.length < 4) return false;

    const now = Date.now();
    const last = lastScanRef.current;
    if (last.code === ticketCode && now - last.at < SCAN_COOLDOWN_MS) {
      return false;
    }

    lastScanRef.current = { code: ticketCode, at: now };
    setScanSuccess(true);
    setScanHint(`Đã nhận: ${ticketCode}`);
    window.setTimeout(() => setScanSuccess(false), 900);
    onScanRef.current?.(ticketCode, { source: 'camera' });
    return true;
  }, []);

  useEffect(() => {
    if (!active) {
      setCameras([]);
      setSelectedCameraId('');
      setLoadingCameras(false);
      setCameraReady(false);
      setScanHint('');
      setScanError('');
      setScanSuccess(false);
      setScanAttempts(0);
      lastScanRef.current = { code: '', at: 0 };
      return undefined;
    }

    let cancelled = false;
    setLoadingCameras(true);

    listPhysicalCameras()
      .then((deviceList) => {
        if (cancelled) return;
        const physicalCameras = filterPhysicalCameras(deviceList);
        if (!physicalCameras.length) {
          onErrorRef.current?.(
            'Không có webcam thật. Tắt OBS Virtual Camera hoặc cắm webcam USB rồi thử lại.',
          );
          setCameras([]);
          setSelectedCameraId('');
          return;
        }
        setCameras(physicalCameras);
        const best = pickBestCamera(physicalCameras);
        setSelectedCameraId(best?.id || physicalCameras[0]?.id || '');
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.message || '';
        if (/permission|denied|not allowed/i.test(message)) {
          onErrorRef.current?.('Quyền camera bị từ chối. Cho phép camera trong Chrome hoặc nhập mã thủ công.');
        } else {
          onErrorRef.current?.('Không thể liệt kê camera. Hãy nhập mã vé thủ công.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCameras(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !selectedCameraId || loadingCameras) return undefined;

    let cancelled = false;

    const notifyError = (message) => {
      if (!cancelled) {
        onErrorRef.current?.(message);
      }
    };

    const startScanner = async () => {
      if (!window.isSecureContext) {
        notifyError('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy nhập mã vé thủ công.');
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!video || !canvas || !ctx) {
        notifyError('Không khởi tạo được vùng quét. Thử tải lại trang.');
        return;
      }

      try {
        const stream = await openCameraStream(selectedCameraId);
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        if ('BarcodeDetector' in window) {
          try {
            const formats = await window.BarcodeDetector.getSupportedFormats();
            if (formats.includes('qr_code')) {
              detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
            }
          } catch {
            detectorRef.current = null;
          }
        }

        if (!cancelled) {
          setCameraReady(true);
          setScanError('');
          setScanHint('Đưa QR vào khung — hệ thống đang quét liên tục');
        }

        const tick = () => {
          if (cancelled || decodingRef.current) return;
          if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

          decodingRef.current = true;
          setScanAttempts((count) => count + 1);

          decodeVideoFrame(video, canvas, ctx, detectorRef.current)
            .then((raw) => {
              if (raw) emitScan(raw);
            })
            .catch(() => {
              /* skip frame */
            })
            .finally(() => {
              decodingRef.current = false;
            });
        };

        scanTimerRef.current = window.setInterval(tick, SCAN_INTERVAL_MS);
        tick();
      } catch (err) {
        if (cancelled) return;
        const message = err?.message || '';
        if (/permission|denied|not allowed/i.test(message)) {
          notifyError('Quyền camera bị từ chối. Cho phép camera trong Chrome hoặc nhập mã thủ công.');
        } else if (/not found|devices|could not start|failed/i.test(message)) {
          notifyError('Không mở được webcam. Kiểm tra cáp USB hoặc chọn camera khác.');
        } else {
          notifyError('Không thể bật camera. Chọn webcam thật (USB) hoặc tải ảnh QR.');
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = 0;
      detectorRef.current = null;
      decodingRef.current = false;
      setCameraReady(false);

      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }

      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, [active, selectedCameraId, loadingCameras, emitScan]);

  const handleCameraChange = useCallback((event) => {
    lastScanRef.current = { code: '', at: 0 };
    setScanHint('');
    setScanError('');
    setScanSuccess(false);
    setScanAttempts(0);
    setSelectedCameraId(event.target.value);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setScanHint('Đang đọc ảnh QR...');
    try {
      const raw = await decodeImageFile(file);
      if (raw && emitScan(raw)) {
        return;
      }
      setScanHint('');
      setScanError('Không đọc được QR trong ảnh. Chọn ảnh rõ hơn hoặc nhập mã TK thủ công.');
    } catch {
      setScanHint('');
      setScanError('Không xử lý được file ảnh.');
    }
  }, [emitScan]);

  return (
    <div className={`staff-qr-scanner ${active ? '' : 'staff-qr-scanner--hidden'}`}>
      {active && cameras.length > 1 && (
        <label className="staff-qr-scanner__camera-select-wrap">
          <span className="staff-qr-scanner__camera-select-label">Camera</span>
          <select
            className="staff-qr-scanner__camera-select"
            value={selectedCameraId}
            onChange={handleCameraChange}
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <div
        className={`staff-qr-scanner__viewport ${scanSuccess ? 'staff-qr-scanner__viewport--success' : ''}`}
      >
        <video
          ref={videoRef}
          className="staff-qr-scanner__video"
          muted
          playsInline
          autoPlay
        />
        <canvas ref={canvasRef} className="staff-qr-scanner__canvas" aria-hidden="true" />
        <div className="staff-qr-scanner__scan-zone" aria-hidden="true">
          <div className="staff-qr-scanner__frame-guide" />
          {active && cameraReady && !scanSuccess && (
            <div className="staff-qr-scanner__scan-pulse" />
          )}
        </div>
        {active && loadingCameras && (
          <p className="staff-qr-scanner__loading">Đang mở camera...</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="staff-qr-scanner__file-input"
        onChange={handleFileChange}
      />

      {active && !loadingCameras && (
        <div className="staff-qr-scanner__toolbar">
          <button type="button" className="staff-qr-scanner__upload-btn" onClick={handleUploadClick}>
            <ImageUp className="w-3.5 h-3.5" />
            Tải ảnh QR
          </button>
          {cameraReady && scanAttempts > 0 && !scanSuccess && (
            <span className="staff-qr-scanner__live-badge">Đang quét...</span>
          )}
        </div>
      )}

      {active && !loadingCameras && scanError && (
        <p className="staff-qr-scanner__scan-error">{scanError}</p>
      )}

      {active && !loadingCameras && scanHint && (
        <p className={`staff-qr-scanner__scan-status ${scanSuccess ? 'staff-qr-scanner__scan-status--success' : ''}`}>
          {scanHint}
        </p>
      )}

      {active && !loadingCameras && (
        <p className="staff-qr-scanner__hint">
          Đưa màn hình điện thoại (Phóng to QR) vào khung webcam. Bật độ sáng tối đa, giữ ổn định 1 giây.
        </p>
      )}
    </div>
  );
};

export default StaffQrScanner;

export const canUseQrScanner = () =>
  typeof window !== 'undefined'
  && window.isSecureContext
  && Boolean(navigator.mediaDevices?.getUserMedia);

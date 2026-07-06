import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { hasPermission, PERMISSIONS } from '../../../shared/utils/permissions';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Scan, QrCode, ClipboardList, ShieldCheck, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { counterService } from '../api/counterService';
import { bookingService } from '../../../shared/services/bookingService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import { CounterPageHeader } from '../components/CounterStaffUI';
import '../styles/counter-staff-theme.css';

// Audio feedback helper using Web Audio API
const playBeep = (isSuccess) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (isSuccess) {
      // Pleasant double beep for success
      const playTone = (pitch, delay, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };
      playTone(880, 0, 0.15); // A5
      playTone(1046.5, 0.12, 0.2); // C6
    } else {
      // Harsh low buzzer for error
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, ctx.currentTime); // Low pitch C3
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.error('Audio feedback error:', e);
  }
};

// TTS helper
const speakText = (text, enabled) => {
  if (!enabled) return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang === 'vi_VN')
        || voices.find(v => v.lang && v.lang.startsWith('vi'));
      if (viVoice) {
        utterance.voice = viVoice;
      }
      utterance.lang = 'vi-VN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.error('TTS error:', e);
  }
};

export default function CounterCheckInPage() {
  const { user } = useAuthContext();
  const canCheckIn = hasPermission(user, PERMISSIONS.TICKET_CHECKIN);
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [cinemasWithRooms, setCinemasWithRooms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);

  const scannerRef = useRef(null);
  const currentRoomUuid = localStorage.getItem('counter_room_uuid');
  const currentCinemaUuid = localStorage.getItem('counter_cinema_uuid');

  // Load bookings and cinema details for display translation
  const loadData = async () => {
    try {
      const [bookingsData, cinemasData] = await Promise.all([
        bookingService.getAdminBookings(),
        cinemaService.getCinemasWithRooms('', 0, 100)
      ]);
      setAllBookings(bookingsData || []);
      setCinemasWithRooms(cinemasData || []);
    } catch (err) {
      console.error('Error loading data for check-in translations:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh bookings list periodically
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Listen to counter location changes in layout
  useEffect(() => {
    const handleLocationChange = () => {
      loadData();
    };
    window.addEventListener('counter-location-changed', handleLocationChange);
    return () => window.removeEventListener('counter-location-changed', handleLocationChange);
  }, []);

  // Lookup booking details from cache
  const findBookingDetails = (bookingUuid) => {
    if (!bookingUuid) return null;
    return allBookings.find(b => b.bookingUuid === bookingUuid);
  };

  // Translate room uuid to name
  const findRoomName = (roomUuid) => {
    if (!roomUuid) return 'N/A';
    for (const cinema of cinemasWithRooms) {
      const room = cinema.rooms?.find(r => r.uuid === roomUuid);
      if (room) return `${cinema.name} - ${room.name}`;
    }
    return 'Phòng không xác định';
  };

  // Perform ticket check-in
  const handleCheckIn = async (codeToSubmit) => {
    if (!canCheckIn) {
      notificationService.error('Bạn không có quyền soát vé');
      return;
    }
    const code = (codeToSubmit || ticketCode).trim();
    if (!code) {
      notificationService.error('Vui lòng nhập hoặc quét mã vé');
      return;
    }

    setLoading(true);
    try {
      const res = await counterService.checkInTicket(code, currentRoomUuid);

      // Fetch fresh bookings to ensure scan details are found
      const freshBookings = await bookingService.getAdminBookings();
      setAllBookings(freshBookings || []);

      const bookingDetails = freshBookings.find(b => b.bookingUuid === res.bookingUuid);

      const success = res.status === 'VALID';
      playBeep(success);

      let speechMsg = res.message;
      if (res.status === 'VALID') {
        speechMsg = 'Soát vé thành công!';
        if (bookingDetails) {
          speechMsg += ` Ghế ${bookingDetails.seats || ''}`;
        }
      } else if (res.status === 'MISMATCHED_ROOM') {
        speechMsg = 'Sai phòng chiếu!';
      } else if (res.status === 'ALREADY_USED') {
        speechMsg = 'Vé đã sử dụng!';
      } else if (res.status === 'CANCELLED') {
        speechMsg = 'Vé đã bị hủy!';
      }
      speakText(speechMsg, audioEnabled);

      const resultObj = {
        code,
        status: res.status,
        message: res.message,
        checkedInAt: res.checkedInAt || new Date().toISOString(),
        expectedRoomName: findRoomName(res.expectedRoomUuid),
        currentRoomName: findRoomName(res.currentRoomUuid),
        booking: bookingDetails || {
          movieTitle: 'Không rõ phim',
          customerName: 'Không rõ khách',
          customerEmail: 'Không rõ email',
          seats: 'Không rõ ghế',
          combos: ''
        }
      };

      setLastScanResult(resultObj);
      setScanHistory(prev => [resultObj, ...prev.slice(0, 19)]);

      if (success) {
        notificationService.success(res.message);
      } else {
        notificationService.error(res.message);
      }
      setTicketCode('');
    } catch (error) {
      playBeep(false);
      speakText('Có lỗi xảy ra, vui lòng soát lại', audioEnabled);
      notificationService.error(error.message || 'Lỗi quét vé');
    } finally {
      setLoading(false);
    }
  };

  // Start QR camera scanning
  const startScanning = () => {
    if (!canCheckIn) {
      notificationService.error('Bạn không có quyền soát vé');
      return;
    }
    setIsScanning(true);
    setLastScanResult(null);

    // Timeout to let element render in DOM
    setTimeout(() => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          'qr-reader-container',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            // Stop scanner on success and process code
            if (scannerRef.current) {
              scannerRef.current.clear().catch(err => console.error(err));
            }
            setIsScanning(false);
            handleCheckIn(decodedText);
          },
          (errorMessage) => {
            // console.log(errorMessage); // silent logs
          }
        );
      } catch (err) {
        console.error('Failed to init QrScanner:', err);
        notificationService.error('Không thể mở camera soát vé');
        setIsScanning(false);
      }
    }, 100);
  };

  // Stop scanning
  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
        .then(() => {
          setIsScanning(false);
        })
        .catch(err => {
          console.error(err);
          setIsScanning(false);
        });
    } else {
      setIsScanning(false);
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, []);

  return (
    <div className="adm-page staff-control counter-checkin">
      <CounterPageHeader
        eyebrow="Trung tâm vận hành rạp"
        title="Hệ thống soát vé QR"
        description="Quét mã QR trên vé của khách hàng hoặc nhập mã thủ công để kiểm thử."
        actions={(
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`staff-control__audio-toggle ${audioEnabled ? 'staff-control__audio-toggle--on' : ''}`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            Âm thanh: {audioEnabled ? 'BẬT (TTS)' : 'TẮT'}
          </button>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <aside className="staff-control__panel staff-control__panel--checkin">
            <h2 className="staff-control__panel-title">
              <Scan className="w-3.5 h-3.5" />
              Quét vé camera
            </h2>

            {isScanning ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-red-500/25 bg-black relative aspect-square max-w-[340px] mx-auto">
                  <div id="qr-reader-container" className="w-full h-full" />
                </div>
                <button type="button" onClick={stopScanning} className="staff-control__btn staff-control__btn--secondary w-full">
                  Tắt camera
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={canCheckIn ? startScanning : undefined}
                onKeyDown={(e) => e.key === 'Enter' && canCheckIn && startScanning()}
                className="counter-checkin__scan-placeholder"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-3">
                  <QrCode className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-300">{canCheckIn ? 'Nhấp để kích hoạt camera' : 'Bạn không có quyền soát vé'}</p>
                <p className="text-[0.65rem] text-slate-500 mt-1">Yêu cầu cấp quyền truy cập camera</p>
              </div>
            )}

            <div className="counter-checkin__divider">Hoặc nhập mã thủ công</div>

            <div className="staff-control__checkin-form">
              <input
                type="text"
                className="staff-control__input"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Ví dụ: T102394..."
                onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              />
              <button
                type="button"
                onClick={() => handleCheckIn()}
                disabled={!canCheckIn || loading || !ticketCode.trim()}
                className="staff-control__btn staff-control__btn--primary w-full"
              >
                {loading ? 'Đang kiểm tra...' : 'Kiểm tra & Soát vé'}
              </button>
            </div>
          </aside>
        </div>

        <div className="lg:col-span-7">
          <section className="staff-control__panel min-h-[380px] flex flex-col">
            {lastScanResult ? (
              <div className="space-y-5 flex-1 flex flex-col">
                <div className={`staff-control__result-banner ${lastScanResult.status === 'VALID' ? 'staff-control__result-banner--success' : 'staff-control__result-banner--error'}`}>
                  {lastScanResult.status === 'VALID' ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      {lastScanResult.status === 'VALID' ? 'VÉ HỢP LỆ' : `LỖI SOÁT VÉ: ${lastScanResult.status}`}
                    </h3>
                    <p className="text-xs mt-1 opacity-90">{lastScanResult.message}</p>
                  </div>
                </div>

                <div className="staff-control__result-details">
                  <div>
                    <span className="staff-control__result-label">Phim chiếu</span>
                    <span className="staff-control__result-value">{lastScanResult.booking.movieTitle}</span>
                  </div>
                  <div>
                    <span className="staff-control__result-label">Phòng chiếu</span>
                    <span className="staff-control__result-value">{lastScanResult.expectedRoomName}</span>
                  </div>
                  <div>
                    <span className="staff-control__result-label">Vị trí ghế</span>
                    <span className="staff-control__result-value staff-control__result-value--accent">{lastScanResult.booking.seats}</span>
                  </div>
                  <div>
                    <span className="staff-control__result-label">Mã giao dịch</span>
                    <span className="staff-control__result-value font-mono">{lastScanResult.code}</span>
                  </div>
                  <div>
                    <span className="staff-control__result-label">Tên khách hàng</span>
                    <span className="staff-control__result-value">{lastScanResult.booking.customerName}</span>
                  </div>
                  <div>
                    <span className="staff-control__result-label">Email</span>
                    <span className="staff-control__result-value truncate block">{lastScanResult.booking.customerEmail}</span>
                  </div>
                  {lastScanResult.booking.combos && (
                    <div className="col-span-2">
                      <span className="staff-control__result-label">Combo bắp nước</span>
                      <span className="staff-control__result-value text-amber-400">{lastScanResult.booking.combos}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Phòng đang soát: {lastScanResult.currentRoomName}</span>
                  <span>Thời gian quét: {new Date(lastScanResult.checkedInAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ) : (
              <div className="staff-control__empty flex-1 flex flex-col justify-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Chưa có thông tin quét vé</p>
                <p className="text-[0.7rem] mt-1 max-w-[280px] mx-auto">
                  Vui lòng quét mã QR hoặc nhập mã vé ở bảng bên trái để hiển thị thông tin chi tiết
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="staff-control__panel">
        <h2 className="staff-control__panel-title">
          <Sparkles className="w-3.5 h-3.5" />
          Lịch sử soát vé phiên làm việc
        </h2>

        {scanHistory.length === 0 ? (
          <p className="staff-control__empty py-4">Chưa có vé nào được soát trong phiên này</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="counter-checkin__history-table">
              <thead>
                <tr>
                  <th>Mã vé</th>
                  <th>Phim</th>
                  <th>Vị trí ghế</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-mono font-bold text-slate-300">{item.code}</td>
                    <td className="font-bold text-white max-w-[200px] truncate">{item.booking.movieTitle}</td>
                    <td className="text-red-400 font-extrabold">{item.booking.seats}</td>
                    <td>{new Date(item.checkedInAt).toLocaleTimeString()}</td>
                    <td>
                      <span className={`counter-checkin__badge ${item.status === 'VALID' ? 'counter-checkin__badge--ok' : 'counter-checkin__badge--err'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-right truncate max-w-[200px]">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

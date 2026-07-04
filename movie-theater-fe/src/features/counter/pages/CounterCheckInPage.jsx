import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Scan, QrCode, ClipboardList, ShieldCheck, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { counterService } from '../api/counterService';
import { bookingService } from '../../../shared/services/bookingService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';

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
    <div className="space-y-8 font-sans max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-indigo-500" />
            Hệ thống soát vé QR
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Quét mã QR trên vé của khách hàng hoặc nhập mã thủ công để kiểm thử
          </p>
        </div>

        {/* Audio control toggles */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            audioEnabled 
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' 
              : 'bg-[#121826] border-[#1E293B] text-gray-400 hover:text-gray-200'
          }`}
        >
          {audioEnabled ? (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Âm thanh: BẬT (TTS)</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Âm thanh: TẮT</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANE: Scan Actions & Camera */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Scan className="w-4 h-4 text-indigo-400" />
              Quét vé camera
            </h2>

            {/* Qr Reader Container */}
            {isScanning ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-indigo-500/30 bg-black relative aspect-square max-w-[340px] mx-auto">
                  <div id="qr-reader-container" className="w-full h-full" />
                </div>
                <button
                  onClick={stopScanning}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tắt camera
                </button>
              </div>
            ) : (
              <div 
                onClick={startScanning}
                className="border-2 border-dashed border-[#1E293B] hover:border-indigo-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer group transition-all bg-[#121826]/40 hover:bg-[#121826]/80"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 transition-colors mb-3">
                  <QrCode className="w-6 h-6 animate-pulse" />
                </div>
                <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                  Nhấp để kích hoạt camera
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Yêu cầu cấp quyền truy cập camera
                </p>
              </div>
            )}

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#1E293B]" />
              <span className="flex-shrink mx-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hoặc nhập mã thủ công</span>
              <div className="flex-grow border-t border-[#1E293B]" />
            </div>

            {/* Manual input */}
            <div className="space-y-2.5">
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Ví dụ: T102394..."
                className="w-full bg-[#121826] border border-[#1E293B] focus:border-indigo-500 rounded-xl py-3 px-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              />
              <button
                onClick={() => handleCheckIn()}
                disabled={loading || !ticketCode.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md hover:shadow-indigo-500/10 cursor-pointer"
              >
                {loading ? 'Đang kiểm tra...' : 'Kiểm tra & Soát vé'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Last scan result & Info */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Scan result display */}
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-6 shadow-xl min-h-[380px] flex flex-col justify-between">
            {lastScanResult ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Result header banner */}
                <div className={`p-4 rounded-xl border flex items-start gap-4 ${
                  lastScanResult.status === 'VALID'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <div className={`p-2 rounded-lg ${
                    lastScanResult.status === 'VALID' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}>
                    {lastScanResult.status === 'VALID' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      {lastScanResult.status === 'VALID' ? 'VÉ HỢP LỆ' : `LỖI SOÁT VÉ: ${lastScanResult.status}`}
                    </h3>
                    <p className="text-xs mt-1 text-gray-300">
                      {lastScanResult.message}
                    </p>
                  </div>
                </div>

                {/* Booking details table */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-[#121826]/40 p-4 border border-[#1E293B] rounded-xl text-xs">
                  <div>
                    <span className="text-gray-500 block font-semibold mb-0.5">Phim chọi</span>
                    <span className="text-white font-bold">{lastScanResult.booking.movieTitle}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-semibold mb-0.5">Phòng chiếu chọi</span>
                    <span className="text-white font-bold">{lastScanResult.expectedRoomName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-semibold mb-0.5">Vị trí ghế</span>
                    <span className="text-indigo-400 font-extrabold text-sm">{lastScanResult.booking.seats}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-semibold mb-0.5">Mã giao dịch</span>
                    <span className="text-gray-300 font-mono">{lastScanResult.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-semibold mb-0.5">Tên khách hàng</span>
                    <span className="text-white font-semibold">{lastScanResult.booking.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-semibold mb-0.5">Email</span>
                    <span className="text-gray-300 truncate block max-w-[200px]">{lastScanResult.booking.customerEmail}</span>
                  </div>
                  {lastScanResult.booking.combos && (
                    <div className="col-span-2 border-t border-[#1E293B] pt-3 mt-1">
                      <span className="text-gray-500 block font-semibold mb-0.5">Combo bắp nước</span>
                      <span className="text-yellow-500 font-semibold">{lastScanResult.booking.combos}</span>
                    </div>
                  )}
                </div>

                {/* Footer verification check */}
                <div className="border-t border-[#1E293B] pt-4 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                  <span>Phòng đang soát: {lastScanResult.currentRoomName}</span>
                  <span>Thời gian quét: {new Date(lastScanResult.checkedInAt).toLocaleTimeString()}</span>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-gray-300">Chưa có thông tin quét vé</h3>
                <p className="text-xs text-gray-500 max-w-[280px] mt-1.5 leading-relaxed">
                  Vui lòng quét mã QR hoặc nhập mã vé ở bảng bên trái để hiển thị thông tin chi tiết
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM SCAN HISTORY LOG */}
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Lịch sử soát vé phiên làm việc
        </h2>

        {scanHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-medium">
            Chưa có vé nào được soát trong phiên này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] text-gray-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Mã vé</th>
                  <th className="pb-3 px-4">Phim</th>
                  <th className="pb-3 px-4">Vị trí ghế</th>
                  <th className="pb-3 px-4">Thời gian</th>
                  <th className="pb-3 px-4">Trạng thái</th>
                  <th className="pb-3 pl-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/40">
                {scanHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 font-mono font-bold text-gray-300">{item.code}</td>
                    <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">{item.booking.movieTitle}</td>
                    <td className="py-3 px-4 text-indigo-400 font-extrabold">{item.booking.seats}</td>
                    <td className="py-3 px-4 text-gray-400">{new Date(item.checkedInAt).toLocaleTimeString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'VALID' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right text-gray-400 truncate max-w-[200px]">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

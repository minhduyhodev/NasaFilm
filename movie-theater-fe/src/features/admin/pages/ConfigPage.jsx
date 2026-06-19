import React, { useState, useEffect } from 'react';
import { 
  Settings, Coins, Sliders, RotateCcw, 
  Sparkles, Tv, Award, Lock, Save
} from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { DEFAULT_SYSTEM_CONFIG } from '../../../shared/constants/systemConfig';
import { writeCachedSystemConfig } from '../../../shared/utils/systemConfig';

const ConfigPage = () => {
  const [config, setConfig] = useState(DEFAULT_SYSTEM_CONFIG);
  const [activeTab, setActiveTab] = useState('showtime');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const data = await systemConfigService.getConfig();
        if (isMounted) {
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to load system configuration', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await systemConfigService.saveConfig(config);
      setConfig(saved);
      notificationService.success('Đã lưu cấu hình hệ thống thành công!');
    } catch (error) {
      notificationService.error(error?.message || 'Không thể lưu cấu hình hệ thống.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục tất cả cấu hình về mặc định của hệ thống?')) {
      return;
    }
    setIsSaving(true);
    try {
      const restored = await systemConfigService.saveConfig(DEFAULT_SYSTEM_CONFIG);
      setConfig(restored);
      notificationService.info('Đã khôi phục cấu hình mặc định.');
    } catch (error) {
      setConfig(DEFAULT_SYSTEM_CONFIG);
      writeCachedSystemConfig(DEFAULT_SYSTEM_CONFIG);
      notificationService.info('Đã khôi phục cấu hình mặc định trên trình duyệt.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-400 text-sm font-mono">
        Đang tải cấu hình hệ thống...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2 font-sans">
            <Settings className="w-6 h-6 text-amber-500" />
            Cấu Hình Hệ Thống
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Thiết lập các tham số vận hành, định giá vé mặc định, và trọng số thuật toán tự động đề xuất suất chiếu.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2238] bg-[#0B0F19] px-4 py-2 text-xs text-gray-300 hover:border-[#2C3B5E] hover:text-white transition-colors cursor-pointer font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi Phục Mặc Định
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs text-black font-bold transition shadow-md shadow-amber-500/10 border-none font-mono cursor-pointer"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Lưu Cấu Hình
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1A2238]/60 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('showtime')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all font-mono cursor-pointer border-none bg-transparent ${
            activeTab === 'showtime'
              ? 'text-amber-500 border-b-2 border-amber-500 rounded-b-none'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Suất Chiếu Tự Động
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all font-mono cursor-pointer border-none bg-transparent ${
            activeTab === 'pricing'
              ? 'text-amber-500 border-b-2 border-amber-500 rounded-b-none'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Định Giá Vé Mặc Định
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all font-mono cursor-pointer border-none bg-transparent ${
            activeTab === 'operations'
              ? 'text-amber-500 border-b-2 border-amber-500 rounded-b-none'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Vận Hành & Bảo Mật
        </button>
      </div>

      {/* Content area */}
      <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-6 shadow-lg">
        {activeTab === 'showtime' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase text-white tracking-wide border-b border-[#1A2238]/40 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Thông số thiết lập Suất chiếu tự động
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Giờ mở cửa rạp tiêu chuẩn</label>
                <input
                  type="time"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.startTime}
                  onChange={(e) => updateField('startTime', e.target.value)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Khung giờ sớm nhất thuật toán tự tạo suất chiếu có thể phân bổ.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Giờ đóng cửa rạp tiêu chuẩn</label>
                <input
                  type="time"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.endTime}
                  onChange={(e) => updateField('endTime', e.target.value)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Thời gian muộn nhất các suất chiếu phải kết thúc trong ngày.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Thời gian dọn dẹp giữa các suất (Phút)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.intervalMinutes}
                  onChange={(e) => updateField('intervalMinutes', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Thời gian chờ tối thiểu để vệ sinh phòng chiếu trước suất tiếp theo.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Thời lượng chiếu Trailer giới thiệu (Phút)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.trailerBuffer}
                  onChange={(e) => updateField('trailerBuffer', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Đệm thời gian quảng cáo đầu phim được cộng thêm vào thời lượng suất.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1A2238]/40">
              <h4 className="text-xs font-bold text-white uppercase mb-4 font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Trọng số điểm ưu tiên (Priority Score weights)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase font-mono">
                    <span className="text-gray-400">Hệ số Giờ vàng (Golden Hour)</span>
                    <span className="text-amber-500">{config.goldenHourWeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    className="w-full accent-amber-500 cursor-pointer bg-[#0B0F19] h-1.5 rounded-lg border-none"
                    value={config.goldenHourWeight}
                    onChange={(e) => updateField('goldenHourWeight', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase font-mono">
                    <span className="text-gray-400">Hệ số Ngày cuối tuần (Weekend)</span>
                    <span className="text-amber-500">{config.weekendWeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    className="w-full accent-amber-500 cursor-pointer bg-[#0B0F19] h-1.5 rounded-lg border-none"
                    value={config.weekendWeight}
                    onChange={(e) => updateField('weekendWeight', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase font-mono">
                    <span className="text-gray-400">Hệ số Điểm đánh giá phim (Rating)</span>
                    <span className="text-amber-500">{config.ratingWeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    className="w-full accent-amber-500 cursor-pointer bg-[#0B0F19] h-1.5 rounded-lg border-none"
                    value={config.ratingWeight}
                    onChange={(e) => updateField('ratingWeight', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase font-mono">
                    <span className="text-gray-400">Hệ số Độ hot thể loại (Genre Popularity)</span>
                    <span className="text-amber-500">{config.genreWeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    className="w-full accent-amber-500 cursor-pointer bg-[#0B0F19] h-1.5 rounded-lg border-none"
                    value={config.genreWeight}
                    onChange={(e) => updateField('genreWeight', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase text-white tracking-wide border-b border-[#1A2238]/40 pb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              Cấu hình Định giá vé cơ bản mặc định
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Giá vé thường mặc định (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.basePrice}
                  onChange={(e) => updateField('basePrice', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Áp dụng cho ghế Standard khi khởi tạo suất chiếu.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Giá vé VIP mặc định (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.vipPrice}
                  onChange={(e) => updateField('vipPrice', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Giá mặc định của loại ghế VIP (giá bán thực tế tại suất chiếu).</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Giá vé Đôi mặc định (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.couplePrice}
                  onChange={(e) => updateField('couplePrice', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Giá mặc định của loại ghế Double/Sofa khi mua vé.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1A2238]/40">
              <h4 className="text-xs font-bold text-white uppercase mb-4 font-mono flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-purple-400" />
                Giá vé xem Streaming Online (VOD)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">
                    Giá vé xem online mặc định (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full bg-[#0B0F19] border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/60"
                    value={config.onlineStreamingPrice}
                    onChange={(e) => updateField('onlineStreamingPrice', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    Áp dụng khi khách mua vé xem phim trực tuyến (VOD) và phim chưa có giá riêng.
                  </p>
                </div>

                <div className="flex items-center">
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl w-full">
                    <p className="text-[10px] text-purple-300 font-mono leading-relaxed">
                      Giá hiện tại: <strong>{Number(config.onlineStreamingPrice || 0).toLocaleString('vi-VN')}đ</strong> / vé VOD.
                      Có thể ghi đè giá riêng cho từng phim tại trang Quản lý Phim.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl mt-4">
              <p className="text-[10px] text-amber-500 font-mono leading-relaxed flex gap-2">
                <Award className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Lưu ý:</strong> Bảng định giá này hoạt động như các giá trị gợi ý mặc định khi Quản trị viên khởi tạo suất chiếu tự động hoặc thủ công. Bạn vẫn có thể tùy chỉnh giá vé của từng suất chiếu riêng biệt tại giao diện quản trị Suất chiếu.
                </span>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase text-white tracking-wide border-b border-[#1A2238]/40 pb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-500" />
              Thiết lập Vận hành & Quy chế Bảo mật
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Thời gian tạm giữ ghế thanh toán (Phút)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.seatLockMinutes}
                  onChange={(e) => updateField('seatLockMinutes', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Thời gian tối đa giữ ghế trống trong DB khi khách hàng tiến hành thanh toán.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Thời hạn hiệu lực của Session đăng nhập (Giờ)</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.sessionTimeoutHours}
                  onChange={(e) => updateField('sessionTimeoutHours', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Quy định thời gian hết hạn của JWT Access Token cho nhân viên và admin.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Tỷ lệ tích lũy điểm hội viên (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                    value={config.pointsEarningRatio}
                    onChange={(e) => updateField('pointsEarningRatio', parseInt(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">%</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Tỷ lệ % tổng giá trị hóa đơn đặt vé được quy đổi thành Điểm thưởng.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 font-mono">Giá trị quy đổi Điểm thưởng (VND / 1 Điểm)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  value={config.pointsToCashValue}
                  onChange={(e) => updateField('pointsToCashValue', parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Số tiền được giảm trừ tương ứng với mỗi 1 Điểm tích lũy khi đổi quà/vé.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPage;

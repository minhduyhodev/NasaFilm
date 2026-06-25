import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Popcorn,
  MonitorPlay,
  Building2,
  MapPin,
  Phone,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TabTransition from '../../../shared/components/TabTransition';
import { comboService } from '../../../shared/services/comboService';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrlUtils';
import { cinemaService } from '../../../shared/services/cinemaService';

import heroBg from '../../../shared/assets/offers_hero_bg.png';
import familyComboImg from '../../../shared/assets/offer_family_combo.png';
import imaxWeekImg from '../../../shared/assets/hero3.jpg';
import vipMemberImg from '../../../shared/assets/MemberRating.jpg';
import landmark81Img from '../../../shared/assets/cinema_landmark81.png';
import cityCenterImg from '../../../shared/assets/cinema_citycenter.png';
import sunsetMallImg from '../../../shared/assets/cinema_sunsetmall.png';
import './OffersPage.css';

const TABS = ['Combo Bắp Nước', 'Loại Phòng', 'Hệ Thống Rạp'];

const COMBO_META = {
  'combo bắp nước': {
    image: familyComboImg,
    description: '1 Bắp lớn + 2 Nước ngọt cỡ vừa. Lựa chọn phổ biến cho cặp đôi khi xem phim.',
  },
  'combo solo': {
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=60',
    description: '1 Bắp lớn + 1 Nước ngọt cỡ vừa. Phù hợp trải nghiệm một mình trọn vẹn.',
  },
  'combo gia đình': {
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&auto=format&fit=crop&q=60',
    description: '2 Bắp lớn + 4 Nước ngọt lớn. Đủ dùng cho gia đình hoặc nhóm bạn.',
  },
};

const FALLBACK_COMBO_IMAGES = [familyComboImg, imaxWeekImg, vipMemberImg];

const ROOM_TYPES = [
  {
    type: 'STANDARD',
    label: 'Standard',
    tagline: 'Tiêu chuẩn',
    description:
      'Phòng chiếu tiêu chuẩn với màn hình sắc nét, âm thanh surround cân bằng — phù hợp mọi thể loại phim với mức giá dễ tiếp cận.',
    features: ['Màn hình 2D/3D chất lượng cao', 'Ghế ngồi êm ái', 'Giá vé hợp lý'],
    image: cityCenterImg,
  },
  {
    type: 'IMAX',
    label: 'IMAX Laser',
    tagline: 'Siêu màn hình',
    description:
      'Trải nghiệm điện ảnh đỉnh cao trên màn hình IMAX Laser khổ lớn, độ phân giải và độ sáng vượt trội cho phim bom tấn và tài liệu.',
    features: ['Màn hình IMAX Laser', 'Hình ảnh sắc nét, sống động', 'Âm thanh vòm chuyên dụng'],
    image: imaxWeekImg,
  },
  {
    type: 'FOUR_DX',
    label: '4DX',
    tagline: 'Đa giác quan',
    description:
      'Ghế chuyển động, hiệu ứng gió, mùi hương và nước đồng bộ với nội dung phim — mang cảm giác hòa mình vào từng cảnh quay.',
    features: ['Ghế chuyển động 21 hướng', 'Hiệu ứng gió, mùi, nước', 'Trải nghiệm immersive'],
    image: sunsetMallImg,
  },
  {
    type: 'DOLBY_ATMOS',
    label: 'Dolby Atmos',
    tagline: 'Âm thanh vòm',
    description:
      'Hệ thống loa Dolby Atmos bao quanh không gian, tái tạo âm thanh theo chiều sâu — lý tưởng cho phim hành động và nhạc kịch.',
    features: ['Loa vòm 360°', 'Âm thanh đa chiều', 'Trung thực từng chi tiết'],
    image: landmark81Img,
  },
  {
    type: 'VIP',
    label: 'Gold Class',
    tagline: 'Đặc quyền VIP',
    description:
      'Ghế recliner cao cấp, không gian riêng tư, dịch vụ order tại chỗ — dành cho khách hàng muốn trải nghiệm điện ảnh thượng lưu.',
    features: ['Ghế recliner da cao cấp', 'Không gian riêng tư', 'Dịch vụ F&B tại ghế'],
    image: vipMemberImg,
  },
];

const ROOM_TYPE_LABELS = {
  STANDARD: 'Standard',
  IMAX: 'IMAX Laser',
  FOUR_DX: '4DX',
  DOLBY_ATMOS: 'Dolby Atmos',
  VIP: 'Gold Class',
};

const CINEMA_IMAGES = [landmark81Img, cityCenterImg, sunsetMallImg];

function resolveComboMeta(combo, index) {
  if (combo?.imageUrl?.trim()) {
    return {
      image: resolveMediaUrl(combo.imageUrl.trim(), 400),
      description:
        combo.description?.trim() ||
        'Combo bắp nước đặc biệt — mua kèm vé xem phim để tiết kiệm hơn.',
    };
  }
  const name = combo?.name || '';
  const key = name.toLowerCase();
  for (const [pattern, meta] of Object.entries(COMBO_META)) {
    if (key.includes(pattern)) return meta;
  }
  return {
    image: FALLBACK_COMBO_IMAGES[index % FALLBACK_COMBO_IMAGES.length],
    description: 'Combo bắp nước đặc biệt — mua kèm vé xem phim để tiết kiệm hơn.',
  };
}

function formatPrice(price) {
  if (price == null) return '—';
  return `${Number(price).toLocaleString('vi-VN')} đ`;
}

const OffersPage = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [combos, setCombos] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [loadingCinemas, setLoadingCinemas] = useState(false);
  const [comboError, setComboError] = useState('');
  const [cinemaError, setCinemaError] = useState('');

  useEffect(() => {
    let cancelled = false;
    comboService
      .getActiveCombos()
      .then((data) => {
        if (!cancelled) setCombos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load combos:', err);
          setComboError('Không thể tải danh sách combo.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCombos(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [cinemasLoaded, setCinemasLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === TABS[0] || cinemasLoaded) return;

    let cancelled = false;
    const load = async () => {
      setLoadingCinemas(true);
      setCinemaError('');
      try {
        const cinemaData = await cinemaService.getCinemasWithRooms('', 0, 100);
        const cinemaList = Array.isArray(cinemaData) ? cinemaData : cinemaData.content || [];
        if (cancelled) return;
        setCinemas(
          cinemaList.map((cinema, index) => ({
            uuid: cinema.uuid,
            name: cinema.name,
            address: cinema.address,
            phone: cinema.phoneNumber || '',
            totalRooms: cinema.totalRooms ?? cinema.rooms?.length ?? 0,
            rooms: cinema.rooms || [],
            image: CINEMA_IMAGES[index % CINEMA_IMAGES.length],
          }))
        );
        setCinemasLoaded(true);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load cinemas:', err);
          setCinemaError('Không thể tải thông tin rạp chiếu.');
        }
      } finally {
        if (!cancelled) setLoadingCinemas(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, cinemasLoaded]);

  const activeRoomTypes = useMemo(() => {
    const types = new Set();
    for (const cinema of cinemas) {
      for (const room of cinema.rooms) {
        if (room.roomType) types.add(room.roomType);
      }
    }
    return types;
  }, [cinemas]);

  const sortedRoomTypes = useMemo(() => {
    const known = ROOM_TYPES.filter((rt) => activeRoomTypes.has(rt.type));
    const unknown = [...activeRoomTypes]
      .filter((t) => !ROOM_TYPES.some((rt) => rt.type === t))
      .map((t) => ({
        type: t,
        label: ROOM_TYPE_LABELS[t] || t,
        tagline: 'Phòng chiếu',
        description: `Phòng chiếu loại ${ROOM_TYPE_LABELS[t] || t} tại hệ thống NASA Film.`,
        features: ['Đang vận hành tại rạp'],
        image: cityCenterImg,
      }));
    return known.length > 0 || unknown.length > 0 ? [...known, ...unknown] : ROOM_TYPES;
  }, [activeRoomTypes]);

  return (
    <div className="offers-page-wrapper">
      <Navbar />

      <section className="offers-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="offers-hero-overlay" />
        <div className="offers-hero-content">
          <motion.h1
            className="offers-hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Combo &amp; Dịch Vụ Rạp
          </motion.h1>
          <motion.p
            className="offers-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Khám phá combo bắp nước, các loại phòng chiếu và hệ thống rạp NASA Film trên toàn quốc.
          </motion.p>
        </div>
      </section>

      <main className="offers-container">
        <div className="offers-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`offers-tab-btn ${activeTab === tab ? 'offers-tab-btn-active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <TabTransition activeKey={activeTab}>
          {activeTab === 'Combo Bắp Nước' && (
            <div className="space-y-8">
              <p className="text-sm text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
                Mua combo trực tuyến cùng vé xem phim để tiết kiệm hơn. Giá và danh mục được cập nhật trực tiếp từ hệ thống.
              </p>

              {loadingCombos ? (
                <div className="offers-state-box">
                  <Loader2 className="h-10 w-10 text-red-500 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-400 font-semibold">Đang tải combo...</p>
                </div>
              ) : comboError ? (
                <div className="offers-state-box">
                  <Popcorn className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">{comboError}</p>
                </div>
              ) : combos.length === 0 ? (
                <div className="offers-state-box">
                  <Popcorn className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">Chưa có combo nào</p>
                </div>
              ) : (
                <div className="offers-grid">
                  {combos.map((combo, index) => {
                    const meta = resolveComboMeta(combo, index);
                    return (
                      <article key={combo.uuid} className="offer-card">
                        <div className="offer-card-img-wrapper">
                          <img src={meta.image} alt={combo.name} className="offer-card-img" />
                          <span className="offer-card-badge">Combo</span>
                        </div>
                        <div className="offer-card-content">
                          <div>
                            <h3 className="offer-card-title">{combo.name}</h3>
                            <p className="offer-card-desc">{meta.description || combo.description}</p>
                          </div>
                          <div className="offer-card-footer">
                            <span className="text-xl font-black text-white font-heading">
                              {formatPrice(combo.price)}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                              Đang bán
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Loại Phòng' && (
            <div className="space-y-8">
              <p className="text-sm text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
                NASA Film cung cấp nhiều loại phòng chiếu — từ tiêu chuẩn đến IMAX, 4DX và Gold Class VIP.
                {activeRoomTypes.size > 0 && (
                  <span className="block mt-1 text-red-400/80">
                    Hiện có {activeRoomTypes.size} loại phòng đang vận hành tại hệ thống.
                  </span>
                )}
              </p>

              {loadingCinemas ? (
                <div className="offers-state-box">
                  <Loader2 className="h-10 w-10 text-red-500 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-400 font-semibold">Đang tải thông tin phòng...</p>
                </div>
              ) : (
                <div className="offers-grid">
                  {sortedRoomTypes.map((room) => (
                    <article key={room.type} className="offer-card">
                      <div className="offer-card-img-wrapper">
                        <img src={room.image} alt={room.label} className="offer-card-img" />
                        <span className="offer-card-badge">{room.tagline}</span>
                        {activeRoomTypes.has(room.type) && (
                          <span className="absolute top-4 right-4 px-2 py-0.5 bg-emerald-600/90 text-white text-[9px] font-black uppercase rounded">
                            Đang có
                          </span>
                        )}
                      </div>
                      <div className="offer-card-content">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <MonitorPlay className="h-4 w-4 text-red-500 shrink-0" />
                            <h3 className="offer-card-title !text-base">{room.label}</h3>
                          </div>
                          <p className="offer-card-desc !line-clamp-none">{room.description}</p>
                          <ul className="space-y-1.5">
                            {room.features.map((f) => (
                              <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                                <Sparkles className="h-3 w-3 text-red-500/70 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Hệ Thống Rạp' && (
            <div className="space-y-8">
              <p className="text-sm text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
                Danh sách rạp chiếu và phòng tương ứng — dữ liệu lấy trực tiếp từ hệ thống quản lý.
              </p>

              {loadingCinemas ? (
                <div className="offers-state-box">
                  <Loader2 className="h-10 w-10 text-red-500 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-400 font-semibold">Đang tải hệ thống rạp...</p>
                </div>
              ) : cinemaError ? (
                <div className="offers-state-box">
                  <Building2 className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">{cinemaError}</p>
                </div>
              ) : cinemas.length === 0 ? (
                <div className="offers-state-box">
                  <Building2 className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">Chưa có rạp chiếu nào</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {cinemas.map((cinema) => (
                    <article
                      key={cinema.uuid}
                      className="flex flex-col md:flex-row gap-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl overflow-hidden"
                    >
                      <div className="md:w-[38%] aspect-[16/10] md:aspect-auto overflow-hidden shrink-0">
                        <img src={cinema.image} alt={cinema.name} className="w-full h-full object-cover min-h-[200px]" />
                      </div>
                      <div className="flex-1 p-6 md:p-8 space-y-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
                            Rạp NASA Film
                          </span>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight mt-1 font-heading">
                            {cinema.name}
                          </h3>
                        </div>

                        <div className="space-y-2 text-sm text-gray-400">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{cinema.address}</span>
                          </div>
                          {cinema.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-red-500 shrink-0" />
                              <a href={`tel:${cinema.phone}`} className="hover:text-white transition">
                                {cinema.phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-red-500 shrink-0" />
                            <span>{cinema.totalRooms} phòng chiếu</span>
                          </div>
                        </div>

                        {cinema.rooms.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-3">
                              Phòng tại rạp
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {cinema.rooms.map((room) => (
                                <span
                                  key={room.uuid}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300"
                                >
                                  <Users className="h-3 w-3 text-red-500/70" />
                                  {room.name}
                                  {room.roomType && (
                                    <span className="text-red-400 font-bold">
                                      · {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                                    </span>
                                  )}
                                  {room.capacity != null && (
                                    <span className="text-gray-500">({room.capacity} ghế)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabTransition>
      </main>

      <Footer />
    </div>
  );
};

export default OffersPage;

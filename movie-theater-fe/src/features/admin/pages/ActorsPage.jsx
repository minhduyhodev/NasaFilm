import React, { useState, useEffect } from 'react';
import { User, Globe, Search, Plus, X, Award, ShieldAlert } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import './ActorsPage.css';

const ActorsPage = () => {
  const [actors, setActors] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActor, setEditingActor] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    avatarUrl: '',
    countryUuid: ''
  });

  const fetchActorsAndCountries = async () => {
    setIsLoading(true);
    try {
      const [actorsData, countriesData] = await Promise.all([
        movieService.getActors(),
        movieService.getCountries()
      ]);
      setActors(actorsData || []);
      setCountriesList(countriesData || []);
    } catch (err) {
      console.error("Failed to load actors or countries:", err);
      notificationService.error("Không thể tải danh mục diễn viên hoặc quốc gia");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActorsAndCountries();
  }, []);

  const handleAddClick = () => {
    setEditingActor(null);
    setFormData({
      fullName: '',
      avatarUrl: '',
      countryUuid: countriesList[0]?.uuid || ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (actor) => {
    setEditingActor(actor);
    setFormData({
      fullName: actor.fullName || '',
      avatarUrl: actor.avatarUrl || '',
      countryUuid: actor.countryUuid || countriesList[0]?.uuid || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      notificationService.error("Tên diễn viên không được để trống");
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      avatarUrl: formData.avatarUrl.trim() || null,
      countryUuid: formData.countryUuid || null
    };

    try {
      if (editingActor) {
        await movieService.updateActor(editingActor.uuid, payload);
        notificationService.success(`Cập nhật thành công diễn viên "${payload.fullName}"`);
      } else {
        await movieService.createActor(payload);
        notificationService.success(`Thêm mới thành công diễn viên "${payload.fullName}"`);
      }
      setIsModalOpen(false);
      fetchActorsAndCountries();
    } catch (err) {
      console.error("Failed to save actor:", err);
      notificationService.error(err.message || "Lưu thông tin diễn viên thất bại");
    }
  };

  const filteredActors = actors.filter(actor =>
    actor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (actor.countryName && actor.countryName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalActors = actors.length;
  const vnActors = actors.filter(a => a.countryName === 'Việt Nam').length;
  const internationalActors = totalActors - vnActors;

  const stats = [
    {
      label: 'TỔNG SỐ DIỄN VIÊN',
      value: String(totalActors),
      sub: 'Tất cả diễn viên trong kho',
      Icon: User,
      color: 'text-indigo-500',
    },
    {
      label: 'DIỄN VIÊN VIỆT NAM',
      value: String(vnActors),
      sub: 'Diễn viên trong nước',
      Icon: Award,
      color: 'text-emerald-500',
    },
    {
      label: 'DIỄN VIÊN QUỐC TẾ',
      value: String(internationalActors),
      sub: 'Diễn viên nước ngoài',
      Icon: Globe,
      color: 'text-amber-500',
    }
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">NASAFilm Cast Directory</p>
          <h1 className="admin-title">Quản Lý Diễn Viên</h1>
          <p className="admin-description">
            Quản lý cơ sở dữ liệu diễn viên, cập nhật ảnh đại diện và liên kết quốc gia nguồn gốc của từng nghệ sĩ.
          </p>
        </div>
        <button className="admin-add-btn" onClick={handleAddClick}>
          <span className="admin-add-btn-plus">+</span>
          <div className="admin-add-btn-label-group">
            <p className="admin-add-btn-sub">DIỄN VIÊN MỚI</p>
            <p className="admin-add-btn-main">Thêm diễn viên</p>
          </div>
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((card, i) => {
          const Icon = card.Icon;
          return (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5 bg-[#121826]/40 hover:border-red-500/20 transition-all duration-300 flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{card.label}</p>
                <p className="text-3xl font-black text-white">{card.value}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
              </div>
              <div className={`p-4 rounded-xl bg-white/5 transition-transform group-hover:scale-105 duration-300 ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Section */}
      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <Search className="admin-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm diễn viên, quốc gia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : filteredActors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
            <ShieldAlert className="w-12 h-12 text-zinc-600 mb-4" />
            <p className="text-sm font-semibold">Không tìm thấy diễn viên nào phù hợp</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr className="admin-table-thead-tr">
                  <th className="pb-4">Ảnh chân dung</th>
                  <th className="pb-4">Họ và tên</th>
                  <th className="pb-4">Quốc gia</th>
                  <th className="pb-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredActors.map((actor) => (
                  <tr key={actor.uuid} className="admin-table-tr border-b border-white/5 align-middle">
                    <td className="py-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center shrink-0">
                        {actor.avatarUrl ? (
                          <img
                            src={actor.avatarUrl}
                            alt={actor.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100';
                            }}
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 font-bold text-white text-sm">
                      {actor.fullName}
                    </td>
                    <td className="py-4">
                      <span className="bg-[#121826] border border-[#1A2238] text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        {actor.countryName || 'Không xác định'}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <button
                        onClick={() => handleEditClick(actor)}
                        className="admin-btn-action-edit"
                      >
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-[#0F1322] border border-[#1A2238] rounded-2xl overflow-hidden shadow-2xl p-6 text-left">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                {editingActor ? 'Chỉnh sửa Diễn viên' : 'Thêm mới Diễn viên'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Họ và tên *</label>
                <input
                  type="text"
                  placeholder="Nhập tên diễn viên..."
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-black/40 border border-[#1A2238] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">URL Ảnh chân dung</label>
                <input
                  type="url"
                  placeholder="Nhập link ảnh chân dung (HTTPS)..."
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  className="w-full bg-black/40 border border-[#1A2238] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Quốc tịch *</label>
                <select
                  value={formData.countryUuid}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryUuid: e.target.value }))}
                  className="w-full bg-black/40 border border-[#1A2238] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer"
                  required
                >
                  {countriesList.map((c) => (
                    <option key={c.uuid} value={c.uuid} className="bg-[#0F1322] text-white">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-[#1A2238] hover:bg-white/5 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all cursor-pointer"
                >
                  {editingActor ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ActorsPage;

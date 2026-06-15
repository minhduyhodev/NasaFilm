import React, { useState, useEffect } from 'react';
import { User, Globe, Search, Plus, X, ShieldAlert } from 'lucide-react';
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

  const handleDeleteActor = async (uuid, fullName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa diễn viên "${fullName}" không?`)) {
      try {
        await movieService.deleteActor(uuid);
        notificationService.success(`Xóa thành công diễn viên "${fullName}"`);
        fetchActorsAndCountries();
      } catch (err) {
        console.error("Failed to delete actor:", err);
        notificationService.error(err.message || "Xóa diễn viên thất bại");
      }
    }
  };

  const filteredActors = actors.filter(actor =>
    actor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (actor.countryName && actor.countryName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Quản Lý Diễn Viên</h1>
          <p className="text-xs text-gray-400 mt-1">Danh mục cơ sở dữ liệu diễn viên và quốc tịch nghệ sĩ.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Tìm kiếm diễn viên, quốc gia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
          <button 
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer"
            onClick={handleAddClick}
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm diễn viên
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : filteredActors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
            <ShieldAlert className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-xs font-semibold">Không tìm thấy diễn viên nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                  <th className="py-2.5 px-4 font-semibold">Ảnh</th>
                  <th className="py-2.5 px-4 font-semibold">Họ và tên</th>
                  <th className="py-2.5 px-4 font-semibold">Quốc gia</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredActors.map((actor) => (
                  <tr key={actor.uuid} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle">
                    <td className="py-2 px-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center shrink-0">
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
                          <User className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 font-bold text-white">
                      {actor.fullName}
                    </td>
                    <td className="py-2 px-4">
                      <span className="bg-[#0F1322] border border-[#1A2238] text-gray-300 text-[10px] font-medium px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Globe className="w-3 h-3 text-zinc-500" />
                        {actor.countryName || 'Không xác định'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(actor)}
                          className="inline-flex items-center justify-center rounded border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[11px] font-bold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/30 transition duration-150 cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteActor(actor.uuid, actor.fullName)}
                          className="inline-flex items-center justify-center rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition duration-150 cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingActor ? 'Chỉnh sửa Diễn viên' : 'Thêm mới Diễn viên'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Họ và tên *</label>
                <input
                  type="text"
                  placeholder="Nhập tên diễn viên..."
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">URL Ảnh chân dung</label>
                <input
                  type="url"
                  placeholder="Nhập link ảnh chân dung (HTTPS)..."
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                />
                {formData.avatarUrl && formData.avatarUrl.trim().startsWith("http") && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Xem trước:</span>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                      <img
                        src={formData.avatarUrl.trim()}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Quốc tịch *</label>
                <select
                  value={formData.countryUuid}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryUuid: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer"
                  required
                >
                  {countriesList.map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
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

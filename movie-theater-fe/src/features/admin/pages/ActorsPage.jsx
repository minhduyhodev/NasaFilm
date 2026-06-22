import React, { useState, useEffect } from "react";
import {
  User,
  Globe,
  Search,
  Plus,
  Loader2,
  Award,
  MapPin,
  Edit2,
  Trash2,
} from "lucide-react";
import { movieService } from "../../../shared/services/movieService";
import { notificationService } from "../../../shared/services/notificationService";
import Pagination from "../../../shared/components/Pagination";
import AdminModal from "../components/AdminModal";
import ActorFormPanel from "../components/panels/ActorFormPanel";
import { PrimaryButton, GhostButton } from "../components";
import "./ActorsPage.css";

const ActorsPage = () => {
  const [actors, setActors] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [actorModal, setActorModal] = useState({ open: false, mode: "create", actor: null });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const fetchActorsAndCountries = async () => {
    setIsLoading(true);
    try {
      const [actorsData, countriesData] = await Promise.all([
        movieService.getActors(),
        movieService.getCountries(),
      ]);
      setActors(actorsData || []);
      setCountriesList(countriesData || []);
    } catch (err) {
      console.error("Failed to load actors or countries:", err);
      notificationService.error(
        "Không thể tải danh mục diễn viên hoặc quốc gia",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActorsAndCountries();
  }, []);

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter logic
  const filteredActors = actors.filter(
    (actor) =>
      actor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (actor.countryName &&
        actor.countryName.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Statistics calculations
  const totalActors = actors.length;
  const totalCountries = countriesList.length;
  const representedNationalities = new Set(
    actors.map((a) => a.countryName).filter(Boolean),
  ).size;

  // Find the country with the most actors
  const countryCounts = actors.reduce((acc, a) => {
    if (a.countryName) {
      acc[a.countryName] = (acc[a.countryName] || 0) + 1;
    }
    return acc;
  }, {});
  let mostCommonCountry = "Không có";
  let maxCount = 0;
  Object.entries(countryCounts).forEach(([country, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonCountry = country;
    }
  });

  // Client-side Paginated actors
  const paginatedActors = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredActors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredActors, currentPage, itemsPerPage]);

  const closeActorModal = () => setActorModal({ open: false, mode: "create", actor: null });

  const handleActorSaved = async () => {
    closeActorModal();
    await fetchActorsAndCountries();
  };

  const handleDeleteActor = async (actor) => {
    if (!window.confirm(`Bạn có chắc muốn xóa diễn viên "${actor.fullName}"?`)) return;
    setIsDeleting(true);
    try {
      await movieService.deleteActor(actor.uuid);
      notificationService.success(`Đã xóa "${actor.fullName}"`);
      closeActorModal();
      await fetchActorsAndCountries();
    } catch (err) {
      notificationService.error(err.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const actorModalTitle =
    actorModal.mode === "create"
      ? "Thêm diễn viên mới"
      : actorModal.mode === "edit"
        ? "Chỉnh sửa diễn viên"
        : actorModal.actor?.fullName || "Chi tiết diễn viên";

  const actorModalSubtitle =
    actorModal.mode === "detail" ? actorModal.actor?.countryName || "Hồ sơ diễn viên" : undefined;

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">
            Cơ Sở Dữ Liệu Nghệ Sĩ
          </p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">
            Quản Lý Diễn Viên
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Danh mục cơ sở dữ liệu diễn viên và quốc tịch nghệ sĩ toàn hệ thống.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm text-white font-bold transition-all shadow-lg cursor-pointer shrink-0 self-start md:self-auto"
          onClick={() => setActorModal({ open: true, mode: "create", actor: null })}
        >
          <Plus size={16} />
          Thêm Diễn Viên
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Tổng Số Diễn Viên",
            value: totalActors,
            icon: User,
            color: "text-indigo-400",
            kpiClass: "kpi-total",
          },
          {
            label: "Quốc Tịch Đại Diện",
            value: representedNationalities,
            icon: Globe,
            color: "text-emerald-400",
            kpiClass: "kpi-represented",
          },
          {
            label: "Quốc Gia Trong DB",
            value: totalCountries,
            icon: MapPin,
            color: "text-blue-400",
            kpiClass: "kpi-database",
          },
          {
            label: "Quốc Tịch Phổ Biến",
            value: mostCommonCountry,
            icon: Award,
            color: "text-amber-400",
            kpiClass: "kpi-popular",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">
                {kpi.label}
              </span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p
              className={`text-xl font-black ${kpi.color} truncate leading-none`}
              title={kpi.value.toString()}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Tìm kiếm diễn viên, quốc gia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>
        <span className="text-sm text-gray-400 font-medium shrink-0">
          {filteredActors.length} diễn viên
        </span>
      </div>

      {/* ACTOR CARD GRID */}
      <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl overflow-hidden p-6 mb-4">
        {isLoading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">
              Đang tải danh sách diễn viên...
            </p>
          </div>
        ) : paginatedActors.length === 0 ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-center">
            <User className="w-16 h-16 text-zinc-700 animate-pulse" />
            <p className="text-sm font-black uppercase tracking-wider text-white">
              Không tìm thấy diễn viên nào phù hợp
            </p>
            <p className="text-xs text-gray-500">
              Thử thay đổi từ khóa hoặc bộ lọc của bạn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedActors.map((actor) => (
              <button
                key={actor.uuid}
                type="button"
                onClick={() => setActorModal({ open: true, mode: "detail", actor })}
                className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 hover:border-gray-600 transition-all duration-200 group flex flex-col gap-3 text-left cursor-pointer w-full"
              >
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#1A2238] bg-slate-800 mx-auto flex items-center justify-center shrink-0">
                  {actor.avatarUrl ? (
                    <img
                      src={actor.avatarUrl}
                      alt={actor.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100";
                      }}
                    />
                  ) : (
                    <User className="w-7 h-7 text-gray-500" />
                  )}
                </div>

                {/* Name */}
                <p className="text-base font-black text-white text-center leading-snug line-clamp-2">
                  {actor.fullName}
                </p>

                {/* Country Badge */}
                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-1.5 bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    {actor.countryName || "Không xác định"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {filteredActors.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredActors.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      <AdminModal
        open={actorModal.open}
        onClose={closeActorModal}
        title={actorModalTitle}
        subtitle={actorModalSubtitle}
        size={actorModal.mode === "detail" ? "md" : "lg"}
      >
        {actorModal.mode === "detail" && actorModal.actor && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-slate-800 flex items-center justify-center">
                {actorModal.actor.avatarUrl ? (
                  <img src={actorModal.actor.avatarUrl} alt={actorModal.actor.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-500" />
                )}
              </div>
              <div className="inline-flex items-center gap-1.5 bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 text-xs px-3 py-1 rounded-full">
                <Globe className="w-3.5 h-3.5" />
                {actorModal.actor.countryName || "Không xác định"}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <PrimaryButton
                type="button"
                className="flex-1 justify-center"
                onClick={() => setActorModal({ open: true, mode: "edit", actor: actorModal.actor })}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Chỉnh sửa
              </PrimaryButton>
              <GhostButton
                type="button"
                className="flex-1 justify-center text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => handleDeleteActor(actorModal.actor)}
                disabled={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </GhostButton>
            </div>
          </div>
        )}
        {(actorModal.mode === "create" || actorModal.mode === "edit") && (
          <ActorFormPanel
            actor={actorModal.mode === "edit" ? actorModal.actor : null}
            countriesList={countriesList}
            onSuccess={handleActorSaved}
            onCancel={closeActorModal}
          />
        )}
      </AdminModal>
    </div>
  );
};

export default ActorsPage;

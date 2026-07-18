import { useState, useEffect, useMemo } from "react";
import {
  User,
  Globe,
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Tags,
} from "lucide-react";
import { movieService } from "../../../shared/services/movieService";
import { notificationService } from "../../../shared/services/notificationService";
import Pagination from "../../../shared/components/Pagination";
import AdminModal from "../components/AdminModal";
import ActorFormPanel from "../components/panels/ActorFormPanel";
import CountryFormPanel from "../components/panels/CountryFormPanel";
import GenreFormPanel from "../components/panels/GenreFormPanel";
import {
  AdminPage,
  PageHeader,
  AdminKpiGrid,
  FilterPills,
  AdminTableShell,
} from "../components";
import "./MediaCatalogPage.css";
import { useConfirm } from "../../../shared/context/ConfirmDialogContext";
import CountryFlag from "../../../shared/components/CountryFlag";

const TABS = [
  { id: "actors", label: "Diễn viên", icon: User },
  { id: "countries", label: "Quốc gia", icon: Globe },
  { id: "genres", label: "Thể loại", icon: Tags },
];

const EMPTY_STATE = {
  actors: { icon: User, message: "Không tìm thấy diễn viên nào" },
  countries: { icon: Globe, message: "Chưa có quốc gia nào" },
  genres: { icon: Tags, message: "Chưa có thể loại nào" },
};

const MediaCatalogPage = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("actors");
  const [actors, setActors] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [genresList, setGenresList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [actorModal, setActorModal] = useState({ open: false, mode: "create", actor: null });
  const [countryModal, setCountryModal] = useState({ open: false, mode: "create", country: null });
  const [genreModal, setGenreModal] = useState({ open: false, mode: "create", genre: null });

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [actorsData, countriesData, genresData] = await Promise.all([
        movieService.getActors(),
        movieService.getCountries(true),
        movieService.getGenres(true),
      ]);
      setActors(actorsData || []);
      setCountriesList(countriesData || []);
      setGenresList(genresData || []);
    } catch (err) {
      console.error("Failed to load media catalog:", err);
      notificationService.error("Không thể tải danh mục truyền thông");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setSearchTerm("");
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredActors = useMemo(
    () =>
      actors.filter(
        (actor) =>
          actor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (actor.countryName &&
            actor.countryName.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [actors, searchTerm],
  );

  const filteredCountries = useMemo(
    () =>
      countriesList.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.code.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [countriesList, searchTerm],
  );

  const filteredGenres = useMemo(
    () =>
      genresList.filter((g) =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [genresList, searchTerm],
  );

  const paginate = (items) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const paginatedActors = useMemo(
    () => paginate(filteredActors),
    [filteredActors, currentPage, itemsPerPage],
  );

  const paginatedCountries = useMemo(
    () => paginate(filteredCountries),
    [filteredCountries, currentPage, itemsPerPage],
  );

  const paginatedGenres = useMemo(
    () => paginate(filteredGenres),
    [filteredGenres, currentPage, itemsPerPage],
  );

  const totalItems =
    activeTab === "actors"
      ? filteredActors.length
      : activeTab === "countries"
        ? filteredCountries.length
        : filteredGenres.length;

  const handleAdd = () => {
    if (activeTab === "actors") setActorModal({ open: true, mode: "create", actor: null });
    else if (activeTab === "countries") setCountryModal({ open: true, mode: "create", country: null });
    else setGenreModal({ open: true, mode: "create", genre: null });
  };

  const addLabel =
    activeTab === "actors"
      ? "Thêm diễn viên"
      : activeTab === "countries"
        ? "Thêm quốc gia"
        : "Thêm thể loại";

  const searchPlaceholder =
    activeTab === "actors"
      ? "Tìm diễn viên, quốc tịch..."
      : activeTab === "countries"
        ? "Tìm quốc gia, mã..."
        : "Tìm thể loại...";

  const handleDeleteActor = async (actor) => {
    const ok = await confirm({
      title: 'Xóa diễn viên',
      message: 'Bạn có chắc muốn xóa diễn viên này không?',
      highlight: actor.fullName,
      detail: 'Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await movieService.deleteActor(actor.uuid);
      notificationService.success(`Đã xóa "${actor.fullName}"`);
      setActorModal({ open: false, mode: "create", actor: null });
      await fetchAll();
    } catch (err) {
      notificationService.error(err.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCountry = async (country) => {
    const ok = await confirm({
      title: 'Xóa quốc gia',
      message: 'Bạn có chắc muốn xóa quốc gia này không?',
      highlight: country.name,
      detail: 'Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await movieService.deleteCountry(country.uuid);
      notificationService.success(`Đã xóa "${country.name}"`);
      setCountryModal({ open: false, mode: "create", country: null });
      await fetchAll();
    } catch (err) {
      notificationService.error(err.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteGenre = async (genre) => {
    const ok = await confirm({
      title: 'Xóa thể loại',
      message: 'Bạn có chắc muốn xóa thể loại này không?',
      highlight: genre.name,
      detail: 'Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await movieService.deleteGenre(genre.uuid);
      notificationService.success(`Đã xóa "${genre.name}"`);
      setGenreModal({ open: false, mode: "create", genre: null });
      await fetchAll();
    } catch (err) {
      notificationService.error(err.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderActions = (onEdit, onDelete) => (
    <div className="catalog-actions">
      <button
        type="button"
        onClick={onEdit}
        className="catalog-action-btn"
        title="Chỉnh sửa"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="catalog-action-btn catalog-action-btn--danger"
        title="Xóa"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderEmpty = (tabId) => {
    const { icon: Icon, message } = EMPTY_STATE[tabId];
    return (
      <div className="media-catalog-empty">
        <Icon className="w-14 h-14 text-zinc-700" />
        <p className="text-sm font-bold uppercase tracking-wide text-white">{message}</p>
        <p className="text-xs text-gray-500">Thử đổi từ khóa hoặc thêm mục mới.</p>
      </div>
    );
  };

  const renderCatalogTable = (columns, rows, emptyTabId) => {
    if (rows.length === 0) return renderEmpty(emptyTabId);

    return (
      <div className="media-catalog-table-wrap">
        <table className="media-catalog-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className || ""}>
                  {col.label}
                </th>
              ))}
              <th className="text-right w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className || ""}>
                    {col.render(row.item)}
                  </td>
                ))}
                <td>{renderActions(row.onEdit, row.onDelete)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="media-catalog-empty">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Đang tải danh mục...</p>
        </div>
      );
    }

    if (activeTab === "actors") {
      return renderCatalogTable(
        [
          {
            key: "avatar",
            label: "Ảnh",
            className: "w-16",
            render: (actor) => (
              <div className="catalog-avatar">
                {actor.avatarUrl ? (
                  <img src={actor.avatarUrl} alt={actor.fullName} />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
              </div>
            ),
          },
          {
            key: "name",
            label: "Tên diễn viên",
            render: (actor) => <span className="catalog-name">{actor.fullName}</span>,
          },
          {
            key: "country",
            label: "Quốc tịch",
            render: (actor) => {
              const code =
                actor.countryCode ||
                countriesList.find((c) => c.uuid === actor.countryUuid)?.code;
              return (
                <span className="catalog-badge">
                  <CountryFlag code={code} name={actor.countryName} size={14} />
                  {actor.countryName || "Không xác định"}
                </span>
              );
            },
          },
        ],
        paginatedActors.map((actor) => ({
          key: actor.uuid,
          item: actor,
          onEdit: () => setActorModal({ open: true, mode: "edit", actor }),
          onDelete: () => handleDeleteActor(actor),
        })),
        "actors",
      );
    }

    if (activeTab === "countries") {
      return renderCatalogTable(
        [
          {
            key: "code",
            label: "Mã",
            className: "w-28",
            render: (item) => (
              <span className="catalog-code catalog-code--with-flag">
                <CountryFlag code={item.code} name={item.name} size={14} />
                {item.code}
              </span>
            ),
          },
          {
            key: "name",
            label: "Tên quốc gia",
            render: (item) => <span className="catalog-name">{item.name}</span>,
          },
        ],
        paginatedCountries.map((country) => ({
          key: country.uuid,
          item: country,
          onEdit: () => setCountryModal({ open: true, mode: "edit", country }),
          onDelete: () => handleDeleteCountry(country),
        })),
        "countries",
      );
    }

    return renderCatalogTable(
      [
        {
          key: "name",
          label: "Tên thể loại",
          render: (item) => <span className="catalog-tag">{item.name}</span>,
        },
      ],
      paginatedGenres.map((genre) => ({
        key: genre.uuid,
        item: genre,
        onEdit: () => setGenreModal({ open: true, mode: "edit", genre }),
        onDelete: () => handleDeleteGenre(genre),
      })),
      "genres",
    );
  };

  return (
    <AdminPage className="media-catalog-page">
      <PageHeader
        eyebrow="Danh mục nội dung"
        title="Truyền thông"
        description="Quản lý diễn viên, quốc gia và thể loại phim trong hệ thống."
        primaryAction={{
          label: addLabel,
          icon: <Plus size={16} />,
          onClick: handleAdd,
        }}
      />

      <AdminKpiGrid
        columns={3}
        items={[
          { label: "Diễn viên", value: actors.length, icon: User, kpiClass: "kpi-total" },
          { label: "Quốc gia", value: countriesList.length, icon: Globe, kpiClass: "kpi-showing" },
          { label: "Thể loại", value: genresList.length, icon: Tags, kpiClass: "kpi-upcoming" },
        ]}
      />

      <AdminTableShell
        toolbar={
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
            <FilterPills
              value={activeTab}
              onChange={setActiveTab}
              items={TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
              ariaLabel="Danh mục truyền thông"
            />
            <div className="adm-toolbar__search max-w-md w-full">
              <Search className="adm-toolbar__search-icon" />
              <input
                type="text"
                className="adm-input"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        }
        footer={
          totalItems > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          ) : null
        }
      >
        {renderTabContent()}
      </AdminTableShell>

      <AdminModal
        open={actorModal.open}
        onClose={() => setActorModal({ open: false, mode: "create", actor: null })}
        title={actorModal.mode === "edit" ? "Chỉnh sửa diễn viên" : "Thêm diễn viên mới"}
        size="lg"
      >
        <ActorFormPanel
          actor={actorModal.mode === "edit" ? actorModal.actor : null}
          countriesList={countriesList}
          onSuccess={async () => {
            setActorModal({ open: false, mode: "create", actor: null });
            await fetchAll();
          }}
          onCancel={() => setActorModal({ open: false, mode: "create", actor: null })}
        />
      </AdminModal>

      <AdminModal
        open={countryModal.open}
        onClose={() => setCountryModal({ open: false, mode: "create", country: null })}
        title={countryModal.mode === "edit" ? "Chỉnh sửa quốc gia" : "Thêm quốc gia mới"}
        size="md"
      >
        <CountryFormPanel
          country={countryModal.mode === "edit" ? countryModal.country : null}
          onSuccess={async () => {
            setCountryModal({ open: false, mode: "create", country: null });
            await fetchAll();
          }}
          onCancel={() => setCountryModal({ open: false, mode: "create", country: null })}
        />
      </AdminModal>

      <AdminModal
        open={genreModal.open}
        onClose={() => setGenreModal({ open: false, mode: "create", genre: null })}
        title={genreModal.mode === "edit" ? "Chỉnh sửa thể loại" : "Thêm thể loại mới"}
        size="md"
      >
        <GenreFormPanel
          genre={genreModal.mode === "edit" ? genreModal.genre : null}
          onSuccess={async () => {
            setGenreModal({ open: false, mode: "create", genre: null });
            await fetchAll();
          }}
          onCancel={() => setGenreModal({ open: false, mode: "create", genre: null })}
        />
      </AdminModal>
    </AdminPage>
  );
};

export default MediaCatalogPage;

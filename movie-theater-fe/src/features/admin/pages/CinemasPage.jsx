import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  MapPin, Search, Edit2, Plus, X, Tv, Activity, Grid, Phone, Layers, 
  Armchair, Hammer, AlertCircle, Loader2, Sparkles, Check, Trash2, 
  ChevronRight, RefreshCw, Download, Upload, Copy, Eye, Sliders, 
  Volume2, Monitor, Shield, Info, Compass, HelpCircle, CheckSquare,
  LayoutDashboard, Film, User, Calendar, Popcorn, Ticket, Tag, Users, LogOut, Menu,
  MousePointer, Settings, AlertTriangle
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';

// ========== CONSTANTS & PRESETS ==========

const FALLBACK_SEAT_TYPES = {
  STANDARD: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  VIP: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  COUPLE: 'cccccccc-cccc-cccc-cccc-cccccccccccc'
};

const SEAT_TYPE_CONFIGS = {
  SELECT: {
    label: 'Công cụ Chọn',
    color: 'bg-[#1E293B] hover:bg-[#334155]',
    border: 'border-slate-500',
    text: 'text-white',
    glow: '',
    accentBg: 'bg-slate-800/25',
    accentBorder: 'border-slate-600'
  },
  STANDARD: {
    label: 'Ghế Thường',
    color: 'bg-emerald-950/60 hover:bg-emerald-900/80',
    border: 'border-emerald-500',
    text: 'text-emerald-400 font-bold',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    accentBg: 'bg-emerald-950/20',
    accentBorder: 'border-emerald-500/40'
  },
  VIP: {
    label: 'Ghế VIP',
    color: 'bg-red-950/60 hover:bg-red-900/80',
    border: 'border-red-500',
    text: 'text-red-400 font-bold',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    accentBg: 'bg-red-950/20',
    accentBorder: 'border-red-500/40'
  },
  COUPLE: {
    label: 'Sofa Đôi',
    color: 'bg-fuchsia-950/60 hover:bg-fuchsia-900/80',
    border: 'border-fuchsia-500',
    text: 'text-fuchsia-400 font-bold',
    glow: 'shadow-[0_0_12px_rgba(217,70,239,0.25)]',
    accentBg: 'bg-fuchsia-950/20',
    accentBorder: 'border-fuchsia-500/40'
  },
  BROKEN: {
    label: 'Bảo Trì / Hỏng',
    color: 'bg-zinc-900/60 hover:bg-zinc-850',
    border: 'border-zinc-700',
    text: 'text-zinc-500 line-through',
    glow: '',
    accentBg: 'bg-zinc-900/20',
    accentBorder: 'border-zinc-700/40'
  }
};

const TEMPLATE_PRESETS = [
  { id: 'small', name: 'Phòng Nhỏ (Standard)', desc: 'Sơ đồ cơ bản 6 hàng x 8 ghế thường.', rows: 6, cols: 8 },
  { id: 'standard', name: 'Phòng Phổ Thông (Mix)', desc: '10 hàng x 12 ghế. VIP ở giữa, Couple ở hàng cuối.', rows: 10, cols: 12 },
  { id: 'vip', name: 'Phòng VIP Premium', desc: 'Sơ đồ sang trọng 6 hàng x 8 ghế (Toàn bộ VIP & Recliner).', rows: 6, cols: 8 },
  { id: 'imax', name: 'Phòng IMAX Hạng Khủng', desc: '14 hàng x 18 ghế. Layout chuẩn rạp IMAX lớn.', rows: 14, cols: 18 }
];

const ROOM_TYPES = [
  { value: 'STANDARD', label: 'Standard 2D/3D', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'IMAX', label: 'IMAX Laser', color: 'text-[#e2c19b] bg-[#e2c19b]/10 border-[#e2c19b]/20 shadow-[0_0_10px_rgba(226,193,155,0.15)]' },
  { value: 'VIP', label: 'VIP Gold Class', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]' },
  { value: 'DOLBY_ATMOS', label: 'Dolby Atmos', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' },
  { value: 'FOUR_DX', label: '4DX Motion Cinema', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.15)]' }
];

// ========== CORE COMPONENT ==========

const CinemasPage = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email || 'ADMIN';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatar = avatarLoadFailed ? huyAdmin : normalizeAvatarUrl(user?.avatar) || huyAdmin;

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // ---------- STATE ----------
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]); // Global statistics computation
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomSeats, setSelectedRoomSeats] = useState([]);
  const [originalSeats, setOriginalSeats] = useState([]); // Compare layout modifications

  // Loading indicator states
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSavingSeats, setIsSavingSeats] = useState(false);
  const [isSavingRoomConfig, setIsSavingRoomConfig] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCinemaModalOpen, setIsCinemaModalOpen] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [cinemaFormData, setCinemaFormData] = useState({ name: '', address: '', phoneNumber: '' });

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({ roomCode: '', name: '', roomType: 'STANDARD', capacity: 0, status: 'ACTIVE' });

  // Interactive Builder States
  const [selectedSeatIds, setSelectedSeatIds] = useState(new Set());
  const [activePaintBrushType, setActivePaintBrushType] = useState('SELECT'); // Pointer tool is default
  const [builderRows, setBuilderRows] = useState(8);
  const [builderCols, setBuilderCols] = useState(12);
  const [aisleColumns, setAisleColumns] = useState([4, 11]); // Vertical aisles layout (Mockup defaults: 4 and 11)
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [showBookingPreview, setShowBookingPreview] = useState(false); // Customer View Simulator
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Drag selection mouse tracking
  const seatGridRef = useRef(null);

  // Discover loaded seat types mapping dynamically from database values
  const seatTypesMap = useMemo(() => {
    const mapping = { ...FALLBACK_SEAT_TYPES };
    originalSeats.forEach(s => {
      if (s.seatTypeName && s.seatTypeUuid) {
        mapping[s.seatTypeName.toUpperCase()] = s.seatTypeUuid;
      }
    });
    return mapping;
  }, [originalSeats]);

  // ---------- DYNAMIC STYLES & FONTS INJECTION ----------
  useEffect(() => {
    // Inject Fonts
    const linkFonts = document.createElement('link');
    linkFonts.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600&family=JetBrains+Mono:wght@500&display=swap";
    linkFonts.rel = "stylesheet";
    document.head.appendChild(linkFonts);

    // Inject Material Symbols Outlined
    const linkSymbols = document.createElement('link');
    linkSymbols.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
    linkSymbols.rel = "stylesheet";
    document.head.appendChild(linkSymbols);

    return () => {
      document.head.removeChild(linkFonts);
      document.head.removeChild(linkSymbols);
    };
  }, []);

  // ---------- DATA FETCHING ----------

  const fetchCinemasAndGlobalStats = async (keepSelection = true) => {
    setIsLoadingCinemas(true);
    try {
      const data = await cinemaService.getCinemas('', 0, 100);
      const list = data.content || data;
      setCinemas(list);
      
      if (list.length > 0) {
        // Resolve selected cinema
        if (!selectedCinema || !keepSelection) {
          setSelectedCinema(list[0]);
        } else {
          const updatedSelected = list.find(c => c.uuid === selectedCinema.uuid);
          if (updatedSelected) setSelectedCinema(updatedSelected);
        }
        
        // Fetch all rooms globally to compute real-time statistics
        const roomsPromises = list.map(c => cinemaService.getRoomsByCinema(c.uuid));
        const roomsResults = await Promise.all(roomsPromises);
        const flatRooms = roomsResults.flat();
        setAllRooms(flatRooms);
      }
    } catch (error) {
      console.error('Failed to fetch cinemas or global stats:', error);
      notificationService.error('Không thể tải danh sách rạp chiếu.');
    } finally {
      setIsLoadingCinemas(false);
    }
  };

  const fetchRooms = async (cinemaUuid, selectRoomUuid = null) => {
    setIsLoadingRooms(true);
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(data);
      if (data.length > 0) {
        if (selectRoomUuid) {
          const match = data.find(r => r.uuid === selectRoomUuid);
          setSelectedRoom(match || data[0]);
        } else if (!selectedRoom || !data.some(r => r.uuid === selectedRoom.uuid)) {
          setSelectedRoom(data[0]);
        } else {
          // Keep current selected room reference refreshed
          const refreshed = data.find(r => r.uuid === selectedRoom.uuid);
          setSelectedRoom(refreshed);
        }
      } else {
        setSelectedRoom(null);
        setSelectedRoomSeats([]);
        setOriginalSeats([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      notificationService.error('Không thể tải danh sách phòng chiếu.');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchSeats = async (roomUuid) => {
    setIsLoadingSeats(true);
    setSelectedSeatIds(new Set());
    try {
      const data = await cinemaService.getSeatsByRoom(roomUuid);
      // Map database format to internal state
      const processedSeats = (data || []).map(seat => {
        // Resolve type based on name or fallbacks
        let currentType = 'STANDARD';
        if (seat.seatTypeName) {
          const mappedName = seat.seatTypeName.toUpperCase();
          if (mappedName === 'VIP') currentType = 'VIP';
          else if (mappedName === 'COUPLE') currentType = 'COUPLE';
        }
        if (seat.status === 'MAINTENANCE') currentType = 'BROKEN';
        else if (seat.status === 'DISABLED') currentType = 'DISABLED_ACCESS';

        return {
          ...seat,
          customTypeName: currentType
        };
      });
      setSelectedRoomSeats(processedSeats);
      setOriginalSeats(JSON.parse(JSON.stringify(processedSeats))); // Deep clone

      // Autoguess dimensions of builder based on actual seats loaded
      if (processedSeats.length > 0) {
        const rows = new Set(processedSeats.map(s => s.rowName));
        const maxNum = Math.max(...processedSeats.map(s => s.seatNumber));
        setBuilderRows(rows.size);
        setBuilderCols(maxNum);
      }
    } catch (error) {
      console.error('Failed to load seats for preview:', error);
      setSelectedRoomSeats([]);
      setOriginalSeats([]);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // Run initial loading
  useEffect(() => {
    fetchCinemasAndGlobalStats();
  }, []);

  // Update room list when cinema changes
  useEffect(() => {
    if (selectedCinema) {
      fetchRooms(selectedCinema.uuid);
    } else {
      setRooms([]);
      setSelectedRoom(null);
      setSelectedRoomSeats([]);
      setOriginalSeats([]);
    }
  }, [selectedCinema]);

  // Update seat builder when selected room changes
  useEffect(() => {
    if (selectedRoom) {
      fetchSeats(selectedRoom.uuid);
    } else {
      setSelectedRoomSeats([]);
      setOriginalSeats([]);
    }
  }, [selectedRoom]);

  // ---------- DERIVED STATISTICS ----------

  const stats = useMemo(() => {
    const totalCinemas = cinemas.length;
    const totalRooms = allRooms.length;
    const activeRooms = allRooms.filter(r => r.status === 'ACTIVE').length;
    const maintenanceRooms = allRooms.filter(r => r.status === 'MAINTENANCE').length;
    const totalCapacity = allRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    return { totalCinemas, totalRooms, activeRooms, maintenanceRooms, totalCapacity };
  }, [cinemas, allRooms]);

  const getCinemaStats = (cinemaUuid) => {
    const cinemaRooms = allRooms.filter(r => r.cinemaUuid === cinemaUuid);
    const capacity = cinemaRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const activeCount = cinemaRooms.filter(r => r.status === 'ACTIVE').length;
    return {
      capacity,
      activeCount,
      totalRoomsCount: cinemaRooms.length
    };
  };

  const filteredCinemas = cinemas.filter(c =>
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (!statusFilter || statusFilter === 'ACTIVE' ? getCinemaStats(c.uuid).activeCount > 0 : getCinemaStats(c.uuid).activeCount === 0)
  );

  // Parse seats into rows mapping for UI layout rendering
  const seatsByRow = useMemo(() => {
    const rows = {};
    selectedRoomSeats.forEach(seat => {
      const r = seat.rowName || 'A';
      if (!rows[r]) rows[r] = [];
      rows[r].push(seat);
    });
    // Sort seats in each row by seatNumber descending (matching screen layout reference)
    Object.keys(rows).forEach(r => {
      rows[r].sort((a, b) => (b.seatNumber || 0) - (a.seatNumber || 0));
    });
    // Sort rows alphabetically
    return Object.keys(rows).sort().reduce((acc, key) => {
      acc[key] = rows[key];
      return acc;
    }, {});
  }, [selectedRoomSeats]);

  // ---------- HANDLERS & ACTIONS ----------

  // Cinema branch modifications
  const handleAddCinemaClick = () => {
    setEditingCinema(null);
    setCinemaFormData({ name: '', address: '', phoneNumber: '' });
    setIsCinemaModalOpen(true);
  };

  const handleEditCinemaClick = (cinema, e) => {
    e.stopPropagation();
    setEditingCinema(cinema);
    setCinemaFormData({
      name: cinema.name,
      address: cinema.address || '',
      phoneNumber: cinema.phoneNumber || '',
    });
    setIsCinemaModalOpen(true);
  };

  const handleCinemaSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCinema) {
        await cinemaService.updateCinema(editingCinema.uuid, cinemaFormData);
        notificationService.success(`Cập nhật thành công chi nhánh "${cinemaFormData.name}"`);
      } else {
        await cinemaService.createCinema(cinemaFormData);
        notificationService.success(`Thêm mới thành công chi nhánh "${cinemaFormData.name}"`);
      }
      setIsCinemaModalOpen(false);
      fetchCinemasAndGlobalStats(true);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi lưu thông tin chi nhánh');
    }
  };

  // Rooms modifications
  const handleAddRoomClick = () => {
    if (!selectedCinema) return;
    setEditingRoom(null);
    setRoomFormData({ roomCode: '', name: '', roomType: 'STANDARD', capacity: 120, status: 'ACTIVE' });
    setIsRoomModalOpen(true);
  };

  const handleEditRoomClick = (room, e) => {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomFormData({
      roomCode: room.roomCode || '',
      name: room.name,
      roomType: room.roomType || 'STANDARD',
      capacity: room.capacity || 0,
      status: room.status || 'ACTIVE',
    });
    setIsRoomModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (editingRoom) {
        result = await cinemaService.updateRoom(editingRoom.uuid, roomFormData);
        notificationService.success(`Cập nhật thành công phòng "${roomFormData.name}"`);
      } else {
        result = await cinemaService.createRoom(selectedCinema.uuid, roomFormData);
        notificationService.success(`Tạo thành công phòng chiếu mới "${roomFormData.name}". Vui lòng sinh sơ đồ ghế.`);
      }
      setIsRoomModalOpen(false);
      fetchCinemasAndGlobalStats(true);
      fetchRooms(selectedCinema.uuid, result?.uuid || editingRoom?.uuid);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi lưu phòng chiếu');
    }
  };

  // Combined master configuration save handler (used by Save Configuration button)
  const handleSaveAllConfiguration = async () => {
    if (!selectedRoom) return;
    setIsSavingSeats(true);
    try {
      // 1. Save Seat Layout modifications
      const modifiedSeats = [];
      for (const seat of selectedRoomSeats) {
        const original = originalSeats.find(o => o.uuid === seat.uuid);
        if (original && (original.seatTypeUuid !== seat.seatTypeUuid || original.status !== seat.status)) {
          modifiedSeats.push(seat);
        }
      }

      if (modifiedSeats.length > 0) {
        const promises = modifiedSeats.map(seat => 
          cinemaService.updateSeat(seat.uuid, {
            seatTypeUuid: seat.seatTypeUuid,
            status: seat.status
          })
        );
        await Promise.all(promises);
      }

      // 2. Save Room main details to database
      await cinemaService.updateRoom(selectedRoom.uuid, {
        roomCode: selectedRoom.roomCode,
        name: selectedRoom.name,
        roomType: selectedRoom.roomType,
        capacity: selectedRoom.capacity,
        status: selectedRoom.status
      });

      notificationService.success('Đã cập nhật cấu hình phòng chiếu và sơ đồ ghế thành công!');
      fetchSeats(selectedRoom.uuid);
      fetchCinemasAndGlobalStats(true);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      notificationService.error(error.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setIsSavingSeats(false);
    }
  };

  // ---------- INTERACTIVE SEAT LAYOUT BUILDER & PAINT TOOL ----------

  // Map painted visual label to database model type and status
  const getBackendDataForPaintType = useCallback((paintType) => {
    switch (paintType) {
      case 'VIP':
        return { seatTypeUuid: seatTypesMap['VIP'], status: 'ACTIVE' };
      case 'COUPLE':
        return { seatTypeUuid: seatTypesMap['COUPLE'], status: 'ACTIVE' };
      case 'RECLINER':
        // Custom UI type, maps to VIP in DB
        return { seatTypeUuid: seatTypesMap['VIP'], status: 'ACTIVE' };
      case 'WHEELCHAIR':
        // Custom UI type, maps to Standard in DB
        return { seatTypeUuid: seatTypesMap['STANDARD'], status: 'ACTIVE' };
      case 'DISABLED_ACCESS':
        return { seatTypeUuid: seatTypesMap['STANDARD'], status: 'DISABLED' };
      case 'BROKEN':
        return { seatTypeUuid: seatTypesMap['STANDARD'], status: 'MAINTENANCE' };
      case 'STANDARD':
      default:
        return { seatTypeUuid: seatTypesMap['STANDARD'], status: 'ACTIVE' };
    }
  }, [seatTypesMap]);

  // Bulk paint active selected seats in local state
  const handlePaintSelection = useCallback((paintType) => {
    if (selectedSeatIds.size === 0) {
      notificationService.warning('Vui lòng chọn các ghế trong sơ đồ trước khi tô màu!');
      return;
    }

    const { seatTypeUuid, status } = getBackendDataForPaintType(paintType);

    setSelectedRoomSeats(prev => prev.map(s => {
      if (selectedSeatIds.has(s.uuid)) {
        return {
          ...s,
          seatTypeUuid,
          status,
          customTypeName: paintType
        };
      }
      return s;
    }));

    setSelectedSeatIds(new Set()); // Reset selection after painting
    notificationService.success(`Đã tô màu ${selectedSeatIds.size} ghế thành loại: ${SEAT_TYPE_CONFIGS[paintType].label}`);
  }, [selectedSeatIds, getBackendDataForPaintType]);

  // Bulk update status directly in selection
  const handleBulkStatusChange = useCallback((status) => {
    if (selectedSeatIds.size === 0) return;

    setSelectedRoomSeats(prev => prev.map(s => {
      if (selectedSeatIds.has(s.uuid)) {
        let customTypeName = s.customTypeName;
        if (status === 'MAINTENANCE') customTypeName = 'BROKEN';
        else if (status === 'DISABLED') customTypeName = 'DISABLED_ACCESS';
        else if (status === 'ACTIVE' && (customTypeName === 'BROKEN' || customTypeName === 'DISABLED_ACCESS')) {
          customTypeName = s.seatTypeName?.toUpperCase() || 'STANDARD';
        }

        return {
          ...s,
          status,
          customTypeName
        };
      }
      return s;
    }));

    setSelectedSeatIds(new Set());
    notificationService.success(`Đã cập nhật trạng thái hoạt động cho ${selectedSeatIds.size} ghế`);
  }, [selectedSeatIds]);

  // Perform backend updates to save the painted grid layout in batch
  const handleSaveSeatLayout = async () => {
    if (!selectedRoom) return;
    setIsSavingSeats(true);
    try {
      const modifiedSeats = [];
      for (const seat of selectedRoomSeats) {
        const original = originalSeats.find(o => o.uuid === seat.uuid);
        if (original && (original.seatTypeUuid !== seat.seatTypeUuid || original.status !== seat.status)) {
          modifiedSeats.push(seat);
        }
      }

      if (modifiedSeats.length === 0) {
        notificationService.info('Không có thay đổi nào trong sơ đồ ghế cần lưu.');
        setIsSavingSeats(false);
        return;
      }

      // Execute updates sequentially or concurrently depending on server limits
      const promises = modifiedSeats.map(seat => 
        cinemaService.updateSeat(seat.uuid, {
          seatTypeUuid: seat.seatTypeUuid,
          status: seat.status
        })
      );
      await Promise.all(promises);

      notificationService.success(`Đã cập nhật sơ đồ thực tế: ${modifiedSeats.length} vị trí ghế đã lưu.`);
      fetchSeats(selectedRoom.uuid);
      fetchCinemasAndGlobalStats(true);
    } catch (error) {
      console.error('Failed to save layout:', error);
      notificationService.error(error.message || 'Lỗi khi lưu sơ đồ ghế');
    } finally {
      setIsSavingSeats(false);
    }
  };

  // Re-generate layout mapping based on rows & columns settings
  const handleGenerateBaseLayout = async () => {
    if (!selectedRoom) return;
    
    const finalRows = parseInt(builderRows) || 8;
    const finalCols = parseInt(builderCols) || 12;
    
    if (finalRows < 1 || finalRows > 26 || finalCols < 1 || finalCols > 30) {
      notificationService.error('Số hàng ghế phải từ 1 đến 26, số cột ghế phải từ 1 đến 30!');
      return;
    }

    const confirmRegen = window.confirm(
      `Cảnh báo: Việc khởi tạo lại sơ đồ ghế sẽ XÓA sạch toàn bộ bố cục sơ đồ hiện tại của phòng "${selectedRoom.name}". Bạn có chắc chắn muốn tiếp tục không?`
    );
    if (!confirmRegen) return;

    setIsLoadingSeats(true);
    try {
      await cinemaService.generateSeats(selectedRoom.uuid, finalRows, finalCols);
      notificationService.success(`Đã khởi tạo sơ đồ cơ sở ${finalRows} hàng x ${finalCols} ghế thành công.`);
      fetchSeats(selectedRoom.uuid);
      fetchCinemasAndGlobalStats(true);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi thiết lập lại sơ đồ');
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // Preset Layout Selector
  const handleApplyPresetTemplate = (preset) => {
    setBuilderRows(preset.rows);
    setBuilderCols(preset.cols);
    
    // Automatically configure custom spacing
    if (preset.id === 'imax') {
      setAisleColumns([4, 15]);
    } else if (preset.id === 'vip') {
      setAisleColumns([2, 7]);
    } else {
      setAisleColumns([3, 9]);
    }

    notificationService.info(`Đã cấu hình thông số preset "${preset.name}". Nhấp "Khởi Tạo Sơ Đồ" để sinh ghế.`);
  };

  // Clone layout from another room
  const handleCloneLayout = async (sourceRoomUuid) => {
    if (!selectedRoom || !sourceRoomUuid) return;
    setIsLoadingSeats(true);
    try {
      const sourceSeats = await cinemaService.getSeatsByRoom(sourceRoomUuid);
      if (sourceSeats.length === 0) {
        notificationService.warning('Phòng nguồn chưa có sơ đồ ghế.');
        setIsLoadingSeats(false);
        return;
      }

      // First generate identical base dimensions
      const rows = new Set(sourceSeats.map(s => s.rowName));
      const maxCol = Math.max(...sourceSeats.map(s => s.seatNumber));
      await cinemaService.generateSeats(selectedRoom.uuid, rows.size, maxCol);
      
      // Load the freshly generated seats to copy details into
      const freshSeats = await cinemaService.getSeatsByRoom(selectedRoom.uuid);
      
      // Update each fresh seat with matching type and status from source layout
      const clonePromises = [];
      for (const freshSeat of freshSeats) {
        const sourceMatch = sourceSeats.find(
          src => src.rowName === freshSeat.rowName && src.seatNumber === freshSeat.seatNumber
        );
        if (sourceMatch) {
          clonePromises.push(
            cinemaService.updateSeat(freshSeat.uuid, {
              seatTypeUuid: sourceMatch.seatTypeUuid,
              status: sourceMatch.status
            })
          );
        }
      }
      
      await Promise.all(clonePromises);
      notificationService.success('Sao chép sơ đồ bố cục thành công!');
      fetchSeats(selectedRoom.uuid);
    } catch (error) {
      console.error('Failed to clone layout:', error);
      notificationService.error('Có lỗi xảy ra khi sao chép sơ đồ phòng.');
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // Export Room Layout JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(selectedRoomSeats, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `layout_${selectedCinema?.name.replace(/\s+/g, '_')}_${selectedRoom?.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notificationService.success('Đã xuất file sơ đồ JSON thành công.');
  };

  // Import Room Layout JSON
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) throw new Error('File JSON không hợp lệ. Phải là một mảng.');
      
      // Verify keys
      const testItem = parsed[0];
      if (!testItem || !testItem.rowName || !testItem.seatNumber) {
        throw new Error('Cấu trúc phần tử ghế không chứa rowName hoặc seatNumber');
      }

      // Map imported configurations onto current local state matching rowName and seatNumber
      setSelectedRoomSeats(prev => prev.map(currentSeat => {
        const match = parsed.find(
          imported => imported.rowName === currentSeat.rowName && imported.seatNumber === currentSeat.seatNumber
        );
        if (match) {
          // Resolve standard mapping
          let customTypeName = match.customTypeName || 'STANDARD';
          return {
            ...currentSeat,
            seatTypeUuid: match.seatTypeUuid || currentSeat.seatTypeUuid,
            status: match.status || currentSeat.status,
            customTypeName: customTypeName
          };
        }
        return currentSeat;
      }));

      setIsImportExportOpen(false);
      setImportJsonText('');
      notificationService.success('Đã nạp file sơ đồ tạm thời. Hãy nhấp "LƯU SƠ ĐỒ THỰC TẾ" để ghi nhớ.');
    } catch (e) {
      notificationService.error(`Lỗi nạp sơ đồ: ${e.message}`);
    }
  };

  const paintSingleSeat = useCallback((uuid, paintType) => {
    const { seatTypeUuid, status } = getBackendDataForPaintType(paintType);
    setSelectedRoomSeats(prev => prev.map(s => {
      if (s.uuid === uuid) {
        return {
          ...s,
          seatTypeUuid,
          status,
          customTypeName: paintType
        };
      }
      return s;
    }));
  }, [getBackendDataForPaintType]);

  // Mouse Selection drag-select triggers
  const handleSeatMouseDown = (uuid) => {
    setIsDragSelecting(true);
    if (activePaintBrushType && activePaintBrushType !== 'SELECT') {
      paintSingleSeat(uuid, activePaintBrushType);
    } else {
      setSelectedSeatIds(prev => {
        const next = new Set(prev);
        if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
        return next;
      });
    }
  };

  const handleSeatMouseEnter = (uuid) => {
    if (isDragSelecting) {
      if (activePaintBrushType && activePaintBrushType !== 'SELECT') {
        paintSingleSeat(uuid, activePaintBrushType);
      } else {
        setSelectedSeatIds(prev => {
          const next = new Set(prev);
          next.add(uuid);
          return next;
        });
      }
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  // Compute stats of seats inside current room mapping
  const seatCounts = useMemo(() => {
    const counts = { STANDARD: 0, VIP: 0, COUPLE: 0, BROKEN: 0 };
    selectedRoomSeats.forEach(s => {
      if (s.customTypeName) {
        counts[s.customTypeName] = (counts[s.customTypeName] || 0) + 1;
      }
    });
    return counts;
  }, [selectedRoomSeats]);

  return (
    <>
      <style>{`
        .premium-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .premium-scroll::-webkit-scrollbar-track { background: #0B0F19; }
        .premium-scroll::-webkit-scrollbar-thumb { background: #1A2238; }
        
        .seat-item {
          transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease;
        }
        .seat-item:hover {
          transform: scale(1.2);
          z-index: 10;
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Kiến Trúc Rạp Chiếu</h1>
          <p className="text-xs text-gray-400 mt-1">
            Cấu hình chi nhánh rạp, phòng chiếu và thiết lập sơ đồ ghế trực quan.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => {
              if (selectedRoom) {
                setEditingRoom(selectedRoom);
                setRoomFormData({
                  roomCode: selectedRoom.roomCode || '',
                  name: selectedRoom.name,
                  roomType: selectedRoom.roomType || 'STANDARD',
                  capacity: selectedRoom.capacity || 0,
                  status: selectedRoom.status || 'ACTIVE',
                });
                setIsRoomModalOpen(true);
              } else {
                notificationService.warning('Vui lòng chọn phòng chiếu trước!');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2238] bg-[#0B0F19] px-4 py-2 text-xs text-gray-300 hover:border-[#2C3B5E] hover:text-white transition-colors cursor-pointer select-none"
          >
            <Sliders className="w-3.5 h-3.5" />
            Sửa Phòng Chiếu
          </button>
          <button 
            type="button"
            onClick={handleAddCinemaClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold transition shadow-md shadow-red-600/20 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            Thêm Rạp Mới
          </button>
        </div>
      </div>

      {/* Page KPI Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Số Chi Nhánh</span>
            <h3 className="text-2xl font-black text-white">{stats.totalCinemas}</h3>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <MapPin className="w-5 h-5 text-red-400" />
          </div>
        </div>
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Số Phòng</span>
            <h3 className="text-2xl font-black text-white">{stats.totalRooms}</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20">
            <Tv className="w-5 h-5 text-[#818cf8]" />
          </div>
        </div>
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Phòng Hoạt Động</span>
            <h3 className="text-2xl font-black text-emerald-400">{stats.activeRooms}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Sức Chứa (Ghế)</span>
            <h3 className="text-2xl font-black text-amber-400">{stats.totalCapacity}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Grid className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-12 gap-6 text-left">
        {/* Left Column: Cinemas List */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-[#0F1322] p-6 border border-[#1A2238] rounded-xl shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-bold uppercase text-white tracking-wide">Danh Sách Chi Nhánh</h2>
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                HOẠT ĐỘNG: {cinemas.filter(c => getCinemaStats(c.uuid).activeCount > 0).length}
              </span>
            </div>

            {/* Search filter in Branches */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
              <input
                className="w-full bg-[#0B0F19] border border-[#1A2238] text-xs py-2 pl-9 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-all rounded-lg"
                placeholder="Tìm kiếm chi nhánh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 premium-scroll">
              {isLoadingCinemas ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredCinemas.length > 0 ? (
                filteredCinemas.map((cinema) => {
                  const isSelected = selectedCinema?.uuid === cinema.uuid;
                  const cStats = getCinemaStats(cinema.uuid);
                  const isBranchOpen = cStats.activeCount > 0;

                  return (
                    <div
                      key={cinema.uuid}
                      onClick={() => setSelectedCinema(cinema)}
                      className={`p-4 border transition-all cursor-pointer rounded-lg ${
                        isSelected
                          ? 'bg-[#1e293b]/30 border-red-500/50 shadow-md shadow-red-500/5'
                          : 'bg-[#0B0F19]/60 border-[#1A2238] hover:bg-[#1a2238]/30 hover:border-[#2C3B5E]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-xs text-white uppercase font-black flex items-center gap-1.5 truncate">
                          {cinema.name}
                          <button
                            type="button"
                            onClick={(e) => handleEditCinemaClick(cinema, e)}
                            className="text-gray-400 hover:text-white p-0.5 transition bg-transparent border-none cursor-pointer"
                            title="Chỉnh sửa chi nhánh"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </h3>
                        <span className={`flex items-center gap-1 text-[9px] uppercase font-bold shrink-0 ${isBranchOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isBranchOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                          {isBranchOpen ? 'Đang Mở' : 'Bảo Trì'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 opacity-80 truncate" title={cinema.address}>
                        {cinema.address}
                      </p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#1A2238]/60 text-[9px] text-gray-500 font-mono">
                        <span>{cStats.totalRoomsCount} PHÒNG CHIẾU</span>
                        <span>{cStats.capacity} GHẾ</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-500 border border-dashed border-[#1A2238] rounded-lg p-4 bg-[#0F1322]">
                  <p className="text-xs uppercase tracking-wider">Không tìm thấy chi nhánh</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Room Setup & Seating Chart */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-[#0F1322] border border-[#1A2238] p-6 rounded-xl shadow-lg">
            
            {/* Auditorium Selection */}
            <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-3 border-b border-[#1A2238]/60 premium-scroll">
              {rooms.length > 0 ? (
                rooms.map((room) => {
                  const isRoomSelected = selectedRoom?.uuid === room.uuid;
                  return (
                    <button
                      key={room.uuid}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={`shrink-0 text-xs pb-1.5 uppercase font-bold tracking-wider transition-colors border-b-2 cursor-pointer bg-transparent border-t-0 border-x-0 ${
                        isRoomSelected
                          ? 'text-red-500 border-red-500'
                          : 'text-gray-400 border-transparent hover:text-gray-250'
                      }`}
                    >
                      {room.name} ({room.roomType})
                    </button>
                  );
                })
              ) : (
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Chưa có phòng chiếu</span>
              )}
              <button 
                type="button"
                onClick={handleAddRoomClick}
                className="shrink-0 text-red-500 hover:text-red-400 transition cursor-pointer flex items-center justify-center bg-transparent border-none"
                title="Thêm phòng mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedRoom ? (
              <>
                {/* Seating Layout Size Customization Controls Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-[#0B0F19] border border-[#1A2238] rounded-xl text-left">
                  <div className="md:col-span-2 space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 font-mono">
                      <Grid className="w-3.5 h-3.5 text-red-500" />
                      Cấu hình kích thước sơ đồ ghế
                    </h4>
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1 font-mono">Hàng ghế (A-Z)</label>
                        <input
                          type="number"
                          min="1"
                          max="26"
                          className="w-20 bg-[#0B0F19] border border-[#1A2238] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                          value={builderRows}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBuilderRows(val === '' ? '' : parseInt(val) || 0);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1 font-mono">Số cột ghế</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          className="w-20 bg-[#0B0F19] border border-[#1A2238] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                          value={builderCols}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBuilderCols(val === '' ? '' : parseInt(val) || 0);
                          }}
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleGenerateBaseLayout}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-600/10 border-none"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Khởi Tạo Lại Sơ Đồ
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-500 flex items-center gap-1 font-mono">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Lưu ý: Khởi tạo lại sẽ xóa sạch sơ đồ ghế hiện có của phòng chiếu.
                    </p>
                  </div>

                  <div className="space-y-2 border-l border-[#1A2238]/60 pl-6">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">Sơ đồ mẫu nhanh</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TEMPLATE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPresetTemplate(preset)}
                          className="px-2 py-1 border border-[#1A2238] bg-[#0B0F19] hover:border-red-500/40 text-[9px] font-bold rounded-lg text-gray-400 hover:text-white transition cursor-pointer text-left truncate"
                          title={preset.desc}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Seating Chart Editor Canvas */}
                <div className="relative bg-[#0B0F19] border border-[#1A2238] p-8 mb-6 overflow-hidden rounded-xl select-none">
                  
                  {/* Design/Preview Switch Toolbar */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => setShowBookingPreview(!showBookingPreview)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
                        showBookingPreview
                          ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/20'
                          : 'bg-[#0F1322] border-[#1A2238] text-gray-300 hover:bg-[#1e293b]/40 hover:text-white'
                      }`}
                    >
                      {showBookingPreview ? <Sliders className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showBookingPreview ? 'Thiết Kế' : 'Xem Trước'}
                    </button>
                    
                    {!showBookingPreview && (
                      <>
                        <button
                          type="button"
                          onClick={handleExportJson}
                          className="p-2 text-gray-400 hover:text-white transition cursor-pointer bg-[#0F1322] border border-[#1A2238] rounded-lg border-none"
                          title="Xuất file JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImportJsonText('');
                            setIsImportExportOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white transition cursor-pointer bg-[#0F1322] border border-[#1A2238] rounded-lg border-none"
                          title="Nạp file JSON"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    
                    {/* curved screen visual */}
                    <div className="w-2/3 h-2 bg-red-600/20 mb-12 relative mx-auto rounded-full">
                      <div className="absolute inset-0 bg-red-600/40 blur-md rounded-full"></div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-500 tracking-[0.4em] uppercase font-mono">MÀN CHIẾU CHÍNH</div>
                    </div>

                    {/* Seating Grid Map */}
                    {isLoadingSeats ? (
                      <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : selectedRoomSeats.length === 0 ? (
                      <div className="text-center py-16 border border-dashed border-[#1A2238] rounded-xl p-6 bg-[#0F1322]/40 w-full max-w-lg">
                        <Tv className="w-10 h-10 text-red-500 mx-auto mb-3 opacity-40 animate-pulse" />
                        <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">Chưa có sơ đồ ghế nào</p>
                        <p className="text-xs text-gray-500 mb-4">Nhấp "Khởi tạo lại sơ đồ" phía trên để sinh sơ đồ ghế mặc định.</p>
                      </div>
                    ) : (
                      <>
                        {/* Seating Grid */}
                        <div 
                          ref={seatGridRef}
                          className="flex flex-col gap-2 select-none w-full overflow-x-auto premium-scroll p-6 items-center bg-[#0F1322]/40 border border-[#1A2238]/60 rounded-xl"
                        >
                          {Object.entries(seatsByRow).map(([rowName, rowSeats]) => (
                            <div key={rowName} className="flex items-center gap-3 min-w-max">
                              <span className="w-6 font-mono font-bold text-xs text-gray-400 text-center shrink-0 select-none">{rowName}</span>
                              
                              <div className="flex items-center gap-1.5">
                                {rowSeats.map((seat) => {
                                  const stConfig = SEAT_TYPE_CONFIGS[seat.customTypeName] || SEAT_TYPE_CONFIGS.STANDARD;
                                  const isSelected = selectedSeatIds.has(seat.uuid);
                                  const isAisle = aisleColumns.includes(seat.seatNumber + 1);

                                  return (
                                    <React.Fragment key={seat.uuid}>
                                      {isAisle && (
                                        <div className="w-6 h-7 shrink-0 flex items-center justify-center text-[10px] text-gray-600 border border-dashed border-[#1A2238] rounded-md bg-black/10 select-none">
                                          ⇅
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onMouseDown={() => handleSeatMouseDown(seat.uuid)}
                                        onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                        className={`w-12 h-7 rounded-md text-[9px] font-bold flex items-center justify-center border font-mono transition-all duration-150 seat-item cursor-pointer ${
                                          isSelected
                                            ? 'border-red-500 ring-1 ring-red-500/40 bg-red-500/20 text-white'
                                            : `${stConfig.color} ${stConfig.border} ${stConfig.text} ${stConfig.glow}`
                                        }`}
                                        title={`${rowName}${seat.seatNumber} (${stConfig.label}) - ${seat.status}`}
                                      >
                                        {rowName}{seat.seatNumber}
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                              </div>

                              <span className="w-6 font-mono font-bold text-xs text-gray-400 text-center shrink-0 select-none">{rowName}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Brush Toolbox / Legend */}
                        <div className="mt-12 flex flex-wrap gap-4 justify-center select-none">
                          {Object.entries(SEAT_TYPE_CONFIGS).map(([key, config]) => {
                            const isActiveBrush = activePaintBrushType === key;
                            const isSelectTool = key === 'SELECT';
                            
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  if (showBookingPreview) return;
                                  setActivePaintBrushType(key);
                                  if (selectedSeatIds.size > 0 && !isSelectTool) {
                                    handlePaintSelection(key);
                                  }
                                }}
                                disabled={showBookingPreview}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                                  isActiveBrush && !showBookingPreview
                                    ? 'border-red-500 bg-red-500/10 scale-105'
                                    : 'border-[#1A2238] bg-[#0F1322] hover:border-gray-700 opacity-90 hover:opacity-100'
                                }`}
                              >
                                {isSelectTool ? (
                                  <MousePointer className="w-3.5 h-3.5 text-white shrink-0" />
                                ) : (
                                  <div className={`h-3 w-3 rounded shrink-0 border ${config.color} ${config.border}`} />
                                )}
                                <div className="leading-none font-mono">
                                  <span className="text-[10px] font-bold text-gray-300 uppercase block">{config.label}</span>
                                  {selectedSeatIds.size > 0 && isActiveBrush && !isSelectTool && !showBookingPreview && (
                                    <span className="text-[8px] text-red-400 font-bold block mt-0.5 animate-pulse">ÁP DỤNG VÙNG CHỌN</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Seat Map Statistics Breakdown */}
                        <div className="mt-8 pt-4 border-t border-[#1A2238]/60 flex flex-wrap justify-center gap-6 text-[10px] font-mono text-gray-400">
                          <span>Tổng số ghế hoạt động: <strong className="text-white">{selectedRoomSeats.filter(s => s.status === 'ACTIVE').length}</strong></span>
                          <span>•</span>
                          <span>Thường: <strong className="text-emerald-400">{seatCounts.STANDARD || 0}</strong></span>
                          <span>•</span>
                          <span>VIP: <strong className="text-red-400">{seatCounts.VIP || 0}</strong></span>
                          <span>•</span>
                          <span>Đôi: <strong className="text-fuchsia-400">{seatCounts.COUPLE || 0}</strong></span>
                          <span>•</span>
                          <span>Bảo Trì: <strong className="text-zinc-500">{seatCounts.BROKEN || 0}</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Operations Bar */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#1A2238]/60">
                  <p className="mr-auto text-[10px] text-gray-500 font-mono uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Bố cục phòng chiếu đã được kết nối cơ sở dữ liệu thực
                  </p>
                  <button 
                    type="button"
                    onClick={() => fetchSeats(selectedRoom.uuid)}
                    className="px-5 py-2 bg-[#0F1322] text-gray-305 border border-[#1A2238] rounded-lg font-bold text-xs uppercase hover:bg-[#1a2238]/40 hover:text-white transition cursor-pointer"
                  >
                    Hủy Bỏ Thay Đổi
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveAllConfiguration}
                    disabled={isSavingSeats}
                    className="px-8 py-2 bg-red-600 text-white font-bold rounded-lg text-xs uppercase transition-all hover:bg-red-700 shadow-md shadow-red-600/10 cursor-pointer flex items-center gap-1.5 border-none font-mono"
                  >
                    {isSavingSeats ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu Cấu Hình'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 border border-dashed border-[#1A2238] rounded-xl p-6 bg-[#0F1322]/40">
                <Tv className="w-12 h-12 text-red-500 mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">Chưa chọn phòng chiếu</p>
                <p className="text-xs text-gray-500">Vui lòng chọn hoặc thêm mới phòng chiếu ở danh sách tabs phía trên.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CINEMA MODAL (ADD / EDIT BRANCH) ==================== */}
      {isCinemaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsCinemaModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300 font-sans">
            <div className="flex justify-between items-center mb-5 border-b border-[#1A2238]/60 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4 text-red-500" />
                {editingCinema ? 'Chỉnh Sửa Chi Nhánh' : 'Thêm Chi Nhánh Mới'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCinemaModalOpen(false)}
                className="p-1 rounded hover:bg-white/5 border border-transparent text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCinemaSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Tên Chi Nhánh Rạp *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Ví dụ: NASA Đống Đa"
                  value={cinemaFormData.name}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Địa Chỉ Chi Nhánh *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Địa chỉ chi tiết..."
                  value={cinemaFormData.address}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Số Điện Thoại Vận Hành *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Ví dụ: 1900 1080"
                  value={cinemaFormData.phoneNumber}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, phoneNumber: e.target.value })}
                />
              </div>
              
              <div className="pt-4 border-t border-[#1A2238]/60 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCinemaModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0F1322] border border-[#1A2238] hover:bg-[#1a2238]/40 text-gray-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-mono"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase transition-all hover:bg-red-700 cursor-pointer shadow-md shadow-red-600/10 border-none font-mono"
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ROOM MODAL (ADD / EDIT ROOM) ==================== */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsRoomModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-5 border-b border-[#1A2238]/60 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Tv className="w-4 h-4 text-red-500" />
                {editingRoom ? 'Chỉnh Sửa Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
              </h2>
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(false)}
                className="p-1 rounded hover:bg-white/5 border border-transparent text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Mã Phòng Chiếu *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-red-500/50"
                  placeholder="Ví dụ: ROOM-IMAX-01"
                  value={roomFormData.roomCode}
                  onChange={(e) => setRoomFormData({ ...roomFormData, roomCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Tên Phòng Chiếu *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-red-500/50"
                  placeholder="Ví dụ: Phòng Chiếu Số 1"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Kiểu Phòng Chiếu *</label>
                  <select
                    className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer"
                    value={roomFormData.roomType}
                    onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value })}
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="IMAX">IMAX</option>
                    <option value="FOUR_DX">4DX</option>
                    <option value="DOLBY_ATMOS">Dolby Atmos</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Trạng Thái Vận Hành *</label>
                  <select
                    className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-gray-305 focus:outline-none focus:border-red-500/50 cursor-pointer"
                    value={roomFormData.status}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                    <option value="DISABLED">Vô hiệu hóa</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[#1A2238]/60 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0F1322] border border-[#1A2238] hover:bg-[#1a2238]/40 text-gray-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-mono"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase transition-all hover:bg-red-700 cursor-pointer shadow-md shadow-red-600/10 border-none font-mono"
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== IMPORT / EXPORT DIALOG ==================== */}
      {isImportExportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsImportExportOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-[#1A2238]/60 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Upload className="w-4 h-4 text-red-500" />
                Nạp Sơ Đồ Thiết Kế Từ JSON
              </h2>
              <button
                type="button"
                onClick={() => setIsImportExportOpen(false)}
                className="p-1 rounded hover:bg-white/5 border border-transparent text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                Dán chuỗi dữ liệu JSON sơ đồ ghế đã xuất trước đó vào khung dưới đây. Hệ thống sẽ tự động đối chiếu các cặp `rowName` và `seatNumber` để cập nhật cục bộ.
              </p>
              
              <textarea
                rows="8"
                className="w-full rounded-lg bg-[#0B0F19] border border-[#1A2238] p-3 font-mono text-xs text-emerald-400 placeholder-gray-650 focus:outline-none focus:border-red-500/50"
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
              />
              
              <div className="pt-4 border-t border-[#1A2238]/60 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsImportExportOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0F1322] border border-[#1A2238] hover:bg-[#1a2238]/40 text-gray-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-mono"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase transition-all hover:bg-red-700 cursor-pointer shadow-md shadow-red-600/10 border-none font-mono"
                >
                  Nạp Bố Cục
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CinemasPage;

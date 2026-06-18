import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  MapPin, Search, Edit2, Plus, X, Tv, Activity, Grid, Phone, Layers, 
  Armchair, Hammer, AlertCircle, Loader2, Sparkles, Check, Trash2, 
  ChevronRight, RefreshCw, Download, Upload, Copy, Eye, Sliders, 
  Volume2, Monitor, Shield, Info, Compass, HelpCircle, CheckSquare,
  LayoutDashboard, Film, User, Calendar, Popcorn, Ticket, Tag, Users, LogOut, Menu
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
  STANDARD: {
    label: 'Ghế Thường',
    color: 'bg-[#363433] hover:bg-[#e2c19b]/35',
    border: 'border-transparent',
    text: 'text-[#d1c4b8]',
    glow: '',
    accentBg: 'bg-[#363433]/20',
    accentBorder: 'border-[#4e453c]/50'
  },
  VIP: {
    label: 'Ghế VIP Recliner',
    color: 'bg-[#e2c19b]/40 hover:bg-[#e2c19b]/60',
    border: 'border-[#e2c19b]/60',
    text: 'text-[#e2c19b]',
    glow: 'shadow-[0_0_12px_rgba(226,193,155,0.25)]',
    accentBg: 'bg-[#e2c19b]/10',
    accentBorder: 'border-[#e2c19b]/40'
  },
  COUPLE: {
    label: 'Sofa Đôi',
    color: 'bg-[#93000a]/25 hover:bg-[#93000a]/40',
    border: 'border-[#93000a]/80',
    text: 'text-[#ffb4ab]',
    glow: 'shadow-[0_0_12px_rgba(147,0,10,0.25)]',
    accentBg: 'bg-[#93000a]/10',
    accentBorder: 'border-[#93000a]/40'
  },
  BROKEN: {
    label: 'Ghế Hỏng/Bảo Trì',
    color: 'bg-transparent hover:bg-[#4e453c]/25',
    border: 'border-[#4e453c]',
    text: 'text-[#9a8f84]',
    glow: '',
    accentBg: 'bg-transparent',
    accentBorder: 'border-[#4e453c]'
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
  const [activePaintBrushType, setActivePaintBrushType] = useState('STANDARD'); // Paint bucket selection
  const [builderRows, setBuilderRows] = useState(8);
  const [builderCols, setBuilderCols] = useState(12);
  const [aisleColumns, setAisleColumns] = useState([4, 11]); // Vertical aisles layout (Mockup defaults: 4 and 11)
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [showBookingPreview, setShowBookingPreview] = useState(false); // Customer View Simulator
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Branch Amenities (localStorage-backed state)
  const [branchAmenities, setBranchAmenities] = useState({
    vipLounge: false,
    snackBar: false,
    wheelchairAccess: false,
    valetParking: false
  });

  // Room Technical Specifications (localStorage-backed state)
  const [roomTechSpecs, setRoomTechSpecs] = useState({
    projection: '',
    audioProcessor: '',
    screenMaterial: '',
    seatingSoft: ''
  });

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
      
      // Load branch amenities from localStorage
      const savedAmenities = localStorage.getItem(`branch_amenities_${selectedCinema.uuid}`);
      if (savedAmenities) {
        setBranchAmenities(JSON.parse(savedAmenities));
      } else {
        // Default to all false (no mock data)
        setBranchAmenities({
          vipLounge: false,
          snackBar: false,
          wheelchairAccess: false,
          valetParking: false
        });
      }
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
      
      // Load room technical specifications from localStorage
      const savedTech = localStorage.getItem(`room_tech_${selectedRoom.uuid}`);
      if (savedTech) {
        setRoomTechSpecs(JSON.parse(savedTech));
      } else {
        // Default to empty strings (no mock data)
        setRoomTechSpecs({
          projection: '',
          audioProcessor: '',
          screenMaterial: '',
          seatingSoft: ''
        });
      }
    } else {
      setSelectedRoomSeats([]);
      setOriginalSeats([]);
    }
  }, [selectedRoom]);

  // Toggle branch amenity and save to localStorage
  const handleToggleAmenity = (key) => {
    const next = { ...branchAmenities, [key]: !branchAmenities[key] };
    setBranchAmenities(next);
    if (selectedCinema) {
      localStorage.setItem(`branch_amenities_${selectedCinema.uuid}`, JSON.stringify(next));
    }
  };

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
    // Sort seats in each row by seatNumber
    Object.keys(rows).forEach(r => {
      rows[r].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
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

  // Save changes on Room Configuration Panel (Right Column)
  const handleSaveRoomConfig = async () => {
    if (!selectedRoom) return;
    setIsSavingRoomConfig(true);
    try {
      // Sync parameters to localStorage
      localStorage.setItem(`room_tech_${selectedRoom.uuid}`, JSON.stringify(roomTechSpecs));

      // Sync parameters to room main details
      await cinemaService.updateRoom(selectedRoom.uuid, {
        roomCode: selectedRoom.roomCode,
        name: selectedRoom.name,
        roomType: selectedRoom.roomType,
        capacity: selectedRoom.capacity,
        status: selectedRoom.status
      });
      notificationService.success('Đã lưu cấu hình kỹ thuật của phòng thành công!');
      fetchCinemasAndGlobalStats(true);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi lưu cấu hình kỹ thuật');
    } finally {
      setIsSavingRoomConfig(false);
    }
  };

  // Combined master configuration save handler (used by Save Configuration button)
  const handleSaveAllConfiguration = async () => {
    if (!selectedRoom) return;
    setIsSavingSeats(true);
    setIsSavingRoomConfig(true);
    try {
      // 1. Save Technical Specifications to localStorage
      localStorage.setItem(`room_tech_${selectedRoom.uuid}`, JSON.stringify(roomTechSpecs));

      // 2. Save Seat Layout modifications
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

      // 3. Save Room main details to database
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
      setIsSavingRoomConfig(false);
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
    setIsLoadingSeats(true);
    try {
      await cinemaService.generateSeats(selectedRoom.uuid, builderRows, builderCols);
      notificationService.success(`Đã khởi tạo sơ đồ cơ sở ${builderRows} hàng x ${builderCols} ghế thành công.`);
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

  // Mouse Selection drag-select triggers
  const handleSeatMouseDown = (uuid) => {
    setIsDragSelecting(true);
    setSelectedSeatIds(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };

  const handleSeatMouseEnter = (uuid) => {
    if (isDragSelecting) {
      setSelectedSeatIds(prev => {
        const next = new Set(prev);
        next.add(uuid);
        return next;
      });
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  return (
    <div className="min-h-screen bg-[#141312] text-[#e6e1df] font-body-md relative flex select-none">
      {/* Sidebar TPD Cinema */}
      <aside className="w-64 bg-[#0f0e0d] border-r border-[#4e453c] h-screen fixed left-0 top-0 flex flex-col py-6 px-4 z-40 select-none">
        <div className="px-3 mb-8 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#e2c19b] flex items-center justify-center font-bold text-[#0f0e0d] font-['Bebas_Neue'] text-xl tracking-wider">
            TPD
          </div>
          <div>
            <span className="text-sm font-black tracking-widest text-[#e6e1df] font-['Bebas_Neue'] block leading-none">TPD CINEMA</span>
            <span className="text-[8px] font-['JetBrains_Mono'] text-[#e2c19b] uppercase tracking-[0.2em] block mt-1">Noir Admin Terminal</span>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
          <div>
            <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-[#9a8f84] uppercase">Hệ thống</div>
            <div className="space-y-1">
              <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-205 font-semibold">
                <LayoutDashboard className="w-4 h-4 text-[#9a8f84]" />
                <span>Tổng quan</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-[#9a8f84] uppercase">Nội dung</div>
            <div className="space-y-1">
              <Link to="/admin/movies" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <Film className="w-4 h-4 text-[#9a8f84]" />
                <span>Phim</span>
              </Link>
              <Link to="/admin/actors" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <User className="w-4 h-4 text-[#9a8f84]" />
                <span>Diễn viên</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-[#9a8f84] uppercase">Vận hành</div>
            <div className="space-y-1">
              <Link to="/admin/showtimes" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <Calendar className="w-4 h-4 text-[#9a8f84]" />
                <span>Lịch chiếu</span>
              </Link>
              <NavLink to="/admin/cinemas" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#e2c19b] bg-[#e2c19b]/10 border border-[#e2c19b]/25 font-semibold">
                <Tv className="w-4 h-4 text-[#e2c19b]" />
                <span>Rạp & Phòng</span>
              </NavLink>
              <Link to="/admin/combos" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <Popcorn className="w-4 h-4 text-[#9a8f84]" />
                <span>Bắp nước</span>
              </Link>
              <Link to="/admin/bookings" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <Ticket className="w-4 h-4 text-[#9a8f84]" />
                <span>Đơn hàng</span>
              </Link>
              <Link to="/admin/vouchers" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <Tag className="w-4 h-4 text-[#9a8f84]" />
                <span>Khuyến mãi</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-[#9a8f84] uppercase">Người dùng</div>
            <div className="space-y-1">
              <Link to="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-sm text-[#9a8f84] hover:text-[#e2c19b] hover:bg-[#e2c19b]/5 transition-all duration-200 font-semibold">
                <Users className="w-4 h-4 text-[#9a8f84]" />
                <span>Khách hàng</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="mt-auto border-t border-[#4e453c]/30 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-black/40 border border-[#e2c19b]/30 flex items-center justify-center overflow-hidden shrink-0">
              <img
                alt="Admin Profile"
                className="w-full h-full object-cover"
                src={avatar}
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadFailed(true)}
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-bold text-[#e6e1df] truncate leading-tight">{displayName}</p>
              <p className="text-[8px] text-[#e2c19b] font-medium tracking-wider uppercase mt-0.5 font-['JetBrains_Mono']">
                {user?.roles?.includes('ADMIN') ? 'Quản trị viên' : user?.roles?.includes('STAFF') ? 'Nhân viên' : 'Quản trị viên'}
              </p>
            </div>
            <button 
              onClick={handleLogout} 
              className="rounded-sm p-1.5 text-[#9a8f84] hover:text-red-500 hover:bg-white/5 transition-colors shrink-0 cursor-pointer flex items-center justify-center bg-transparent border-none"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-h-screen ml-64 bg-[#141312] flex flex-col">
        {/* Top Header */}
        <header className="flex justify-between items-center w-full h-16 px-8 sticky top-0 bg-[#141312]/85 backdrop-blur-md border-b border-[#4e453c] z-30 shadow-[0_4px_30px_rgba(226,193,155,0.02)]">
          <div className="flex items-center gap-4">
            <span className="font-['JetBrains_Mono'] text-xs text-[#e2c19b] uppercase tracking-[0.2em]">Hệ thống rạp TPD Cinema</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-['JetBrains_Mono'] text-[#9a8f84]">
            <span>Noir Terminal v2.0</span>
          </div>
        </header>

        {/* Content wrapper */}
        <main className="flex-1 p-8 relative select-none">
          {/* Grain Overlay */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

          <style>{`
            .material-symbols-outlined {
                font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
            }
            .premium-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
            .premium-scroll::-webkit-scrollbar-track { background: #141312; }
            .premium-scroll::-webkit-scrollbar-thumb { background: #4e453c; }
            
            .seat-map-grid {
                display: grid;
                grid-template-columns: repeat(16, minmax(0, 1fr));
                gap: 4px;
            }
            .cinematic-glow {
                box-shadow: 0 0 40px rgba(226, 193, 155, 0.1);
            }
            
            .seat-item {
              transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease;
            }
            .seat-item:hover {
              transform: scale(1.15);
              z-index: 10;
            }
            .seat-item.selected {
              border-color: #e2c19b !important;
              box-shadow: 0 0 10px rgba(226, 193, 155, 0.4);
            }
            
            /* Curved screen visual glowing */
            .curved-screen-gold {
              position: relative;
              width: 100%;
              height: 8px;
              border-radius: 50% / 100% 100% 0 0;
              background: linear-gradient(180deg, rgba(226, 193, 155, 0.6) 0%, rgba(226, 193, 155, 0) 100%);
              filter: drop-shadow(0 0 12px rgba(226, 193, 155, 0.8));
            }
          `}</style>

          {/* Header Section */}
          <div className="flex justify-between items-end mb-12 text-left">
            <div>
              <h1 className="font-['Bebas_Neue'] text-5xl text-[#e6e1df] uppercase leading-none tracking-wider">Kiến Trúc Rạp Chiếu</h1>
              <p className="font-['JetBrains_Mono'] text-xs text-[#e2c19b] mt-2 uppercase tracking-[0.2em]">Cấu Hình Chi Nhánh & Phòng Chiếu</p>
            </div>
            <div className="flex gap-4 font-['JetBrains_Mono'] text-xs uppercase">
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
                className="bg-[#2b2a28] border border-[#4e453c] text-[#e6e1df] px-6 py-2 hover:bg-[#4e453c]/20 transition-all flex items-center gap-2 cursor-pointer rounded-sm"
              >
                <span className="material-symbols-outlined text-sm leading-none">edit_document</span>
                Sửa Phòng Chiếu
              </button>
              <button 
                type="button"
                onClick={handleAddCinemaClick}
                className="bg-[#e2c19b] text-[#412d11] px-8 py-2 font-bold hover:brightness-110 transition-all flex items-center gap-2 cinematic-glow cursor-pointer rounded-sm"
              >
                <span className="material-symbols-outlined text-sm leading-none">add</span>
                Thêm Rạp Mới
              </button>
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-12 gap-6 text-left">
            
            {/* Left Column: Cinema Location Management */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* Branches list */}
              <div className="bg-[#1d1b1a] p-6 border border-[#4e453c] relative group overflow-hidden rounded-sm">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2c19b]/30 to-transparent"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <h2 className="font-['Manrope'] text-lg font-semibold text-[#e6e1df] uppercase tracking-wide">Danh Sách Chi Nhánh</h2>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#e2c19b] bg-[#e2c19b]/10 px-2 py-0.5 rounded-sm">
                    HOẠT ĐỘNG: {cinemas.filter(c => getCinemaStats(c.uuid).activeCount > 0).length}
                  </span>
                </div>

                {/* Search filter in Branches */}
                <div className="relative mb-4">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a8f84] text-sm">search</span>
                  <input
                    className="w-full bg-[#0f0e0d] border border-[#4e453c] text-xs font-['JetBrains_Mono'] py-2 pl-9 pr-4 text-[#e6e1df] placeholder-[#9a8f84]/50 focus:ring-1 focus:ring-[#e2c19b]/30 focus:border-[#e2c19b]/40 transition-all uppercase rounded-sm"
                    placeholder="TÌM KIẾM CHI NHÁNH..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 premium-scroll">
                  {isLoadingCinemas ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="w-6 h-6 border-2 border-[#e2c19b] border-t-transparent rounded-full animate-spin"></div>
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
                          className={`p-4 border-l-2 transition-all cursor-pointer rounded-sm ${
                            isSelected
                              ? 'bg-[#211f1e] border-[#e2c19b] shadow-[0_0_15px_rgba(226,193,155,0.05)]'
                              : 'bg-[#211f1e]/50 border-[#4e453c] hover:bg-[#2b2a28]/50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-['Manrope'] text-sm text-[#e6e1df] uppercase font-bold flex items-center gap-1.5">
                              {cinema.name}
                              <button
                                type="button"
                                onClick={(e) => handleEditCinemaClick(cinema, e)}
                                className="text-[#9a8f84] hover:text-[#e2c19b] p-0.5 transition"
                                title="Chỉnh sửa chi nhánh"
                              >
                                <span className="material-symbols-outlined text-xs leading-none">edit</span>
                              </button>
                            </h3>
                            <span className={`flex items-center gap-1.5 text-[10px] uppercase font-bold ${isBranchOpen ? 'text-[#e2c19b]' : 'text-[#ffb4ab]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isBranchOpen ? 'bg-[#e2c19b] animate-pulse' : 'bg-[#ffb4ab]'}`}></span>
                              {isBranchOpen ? 'Đang Mở' : 'Bảo Trì'}
                            </span>
                          </div>
                          <p className="text-xs text-[#d1c4b8] font-['JetBrains_Mono'] opacity-80 truncate" title={cinema.address}>
                            {cinema.address}
                          </p>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#4e453c]/30 text-[9px] text-[#9a8f84] font-['JetBrains_Mono']">
                            <span>{cStats.totalRoomsCount} PHÒNG CHIẾU</span>
                            <span>{cStats.capacity} GHẾ</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-[#9a8f84] border border-dashed border-[#4e453c] rounded-sm p-4 bg-[#0f0e0d]/20">
                      <p className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider">Không tìm thấy chi nhánh</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Facility Amenities */}
              <div className="bg-[#1d1b1a] p-6 border border-[#4e453c] rounded-sm">
                <h2 className="font-['Manrope'] text-lg font-semibold text-[#e6e1df] uppercase tracking-wide mb-6">Tiện Ích Rạp Chiếu</h2>
                <div className="space-y-4">
                  {[
                    { id: 'vipLounge', label: 'PHÒNG CHỜ VIP' },
                    { id: 'snackBar', label: 'QUẦY BẮP NƯỚC' },
                    { id: 'wheelchairAccess', label: 'HỖ TRỢ XE LĂN' },
                    { id: 'valetParking', label: 'DỊCH VỤ ĐỖ XE' }
                  ].map(item => (
                    <label key={item.id} className="flex justify-between items-center cursor-pointer group select-none">
                      <span className="text-sm font-['JetBrains_Mono'] text-[#d1c4b8] group-hover:text-[#e2c19b] transition-colors">{item.label}</span>
                      <div className="relative inline-flex items-center">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={branchAmenities[item.id] || false}
                          onChange={() => handleToggleAmenity(item.id)}
                        />
                        <div className="w-10 h-5 bg-[#211f1e] border border-[#4e453c] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#e2c19b] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#e2c19b]/20 after:border-[#e2c19b]/40 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e2c19b]/10"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Room Setup & Seating Chart */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Auditorium Selection */}
              <div className="bg-[#1d1b1a] border border-[#4e453c] p-6 rounded-sm">
                <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-4 border-b border-[#4e453c]/30 premium-scroll">
                  {rooms.length > 0 ? (
                    rooms.map((room) => {
                      const isRoomSelected = selectedRoom?.uuid === room.uuid;
                      return (
                        <button
                          key={room.uuid}
                          type="button"
                          onClick={() => setSelectedRoom(room)}
                          className={`shrink-0 font-['JetBrains_Mono'] text-xs pb-2 uppercase tracking-widest transition-colors cursor-pointer ${
                            isRoomSelected
                              ? 'text-[#e2c19b] border-b-2 border-[#e2c19b]'
                              : 'text-[#d1c4b8] hover:text-[#e6e1df]'
                          }`}
                        >
                          {room.name} - {room.roomType}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[#9a8f84] text-xs font-['JetBrains_Mono']">CHƯA CÓ PHÒNG CHIẾU</span>
                  )}
                  <button 
                    type="button"
                    onClick={handleAddRoomClick}
                    className="shrink-0 text-[#e2c19b] hover:opacity-70 transition cursor-pointer"
                    title="Thêm phòng mới"
                  >
                    <span className="material-symbols-outlined text-base mt-0.5 leading-none">add_circle</span>
                  </button>
                </div>

                {selectedRoom ? (
                  <>
                    <div className="grid grid-cols-3 gap-8 mb-8">
                      <div>
                        <p className="text-[10px] text-[#9a8f84] font-['JetBrains_Mono'] uppercase mb-1">Sức Chứa Phòng</p>
                        <p className="font-['Bebas_Neue'] text-3xl text-[#e6e1df] flex items-center gap-2">
                          {selectedRoom.capacity} GHẾ
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoom(selectedRoom);
                              setRoomFormData({
                                roomCode: selectedRoom.roomCode || '',
                                name: selectedRoom.name,
                                roomType: selectedRoom.roomType || 'STANDARD',
                                capacity: selectedRoom.capacity || 0,
                                status: selectedRoom.status || 'ACTIVE',
                              });
                              setIsRoomModalOpen(true);
                            }}
                            className="text-[#9a8f84] hover:text-[#e2c19b] transition"
                            title="Chỉnh sửa thông tin phòng"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">edit</span>
                          </button>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9a8f84] font-['JetBrains_Mono'] uppercase mb-1">Tiêu Chuẩn Hình Ảnh</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="bg-[#e2c19b]/10 text-[#e2c19b] border border-[#e2c19b]/20 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm">
                            {selectedRoom.roomType === 'IMAX' ? 'IMAX 3D' : '4K Laser'}
                          </span>
                          <span className="bg-[#e2c19b]/10 text-[#e2c19b] border border-[#e2c19b]/20 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm">
                            {selectedRoom.roomType === 'FOUR_DX' ? '4DX Motion' : 'HDR10'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9a8f84] font-['JetBrains_Mono'] uppercase mb-1">Tiêu Chuẩn Âm Thanh</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="bg-[#e2c19b]/10 text-[#e2c19b] border border-[#e2c19b]/20 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm">
                            {selectedRoom.roomType === 'DOLBY_ATMOS' ? 'Dolby Atmos' : 'Dolby 7.1'}
                          </span>
                          <span className="bg-[#e2c19b]/10 text-[#e2c19b] border border-[#e2c19b]/20 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm">
                            {selectedRoom.roomType === 'IMAX' ? '12.0 CH' : '11.2 CH'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Seating Chart Editor */}
                    <div className="relative bg-[#0f0e0d] border border-[#4e453c] p-8 mb-6 overflow-hidden rounded-sm select-none">
                      
                      {/* Design/Preview Switch Toolbar */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                        <button
                          type="button"
                          onClick={() => setShowBookingPreview(!showBookingPreview)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm border text-[10px] font-bold font-['JetBrains_Mono'] uppercase tracking-wider transition-all cursor-pointer ${
                            showBookingPreview
                              ? 'bg-[#e2c19b] border-[#e2c19b] text-[#412d11]'
                              : 'bg-[#141312] border-[#4e453c] text-[#d1c4b8] hover:bg-[#2b2a28]/40'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs leading-none">{showBookingPreview ? 'design_services' : 'visibility'}</span>
                          {showBookingPreview ? 'Thiết Kế' : 'Xem Trước'}
                        </button>
                        
                        {!showBookingPreview && (
                          <>
                            <button
                              type="button"
                              onClick={handleExportJson}
                              className="p-1 text-[#d1c4b8] hover:text-[#e2c19b] transition cursor-pointer bg-transparent border-none"
                              title="Xuất file JSON"
                            >
                              <span className="material-symbols-outlined text-sm leading-none">download</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImportJsonText('');
                                setIsImportExportOpen(true);
                              }}
                              className="p-1 text-[#d1c4b8] hover:text-[#e2c19b] transition cursor-pointer bg-transparent border-none"
                              title="Nạp file JSON"
                            >
                              <span className="material-symbols-outlined text-sm leading-none">upload</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        
                        {/* Screen Visualization */}
                        <div className="w-2/3 h-2 bg-[#e2c19b]/20 mb-12 relative">
                          <div className="absolute inset-0 bg-[#e2c19b]/40 blur-md"></div>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-['JetBrains_Mono'] text-[#e2c19b] tracking-[0.4em] uppercase">MÀN CHIẾU CHÍNH</div>
                        </div>

                        {/* Interactive Seat Map View Canvas */}
                        {isLoadingSeats ? (
                          <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-2 border-[#e2c19b] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : selectedRoomSeats.length === 0 ? (
                          <div className="text-center py-16 border border-dashed border-[#4e453c] rounded-sm p-6 bg-[#141312]/50 w-full max-w-lg">
                            <span className="material-symbols-outlined text-[#e2c19b] text-4xl mb-3 opacity-30 leading-none">tv</span>
                            <p className="text-sm font-bold uppercase tracking-wider text-[#e6e1df] mb-1">Chưa có sơ đồ ghế nào được sinh</p>
                            <p className="text-xs text-[#9a8f84] mb-6 font-['JetBrains_Mono']">Hãy thiết lập kích thước và khởi tạo sơ đồ tự động cho phòng chiếu.</p>
                            
                            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto p-4 bg-[#1d1b1a]/50 border border-[#4e453c] rounded-sm mb-4 text-left">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9a8f84] border-b border-[#4e453c] pb-1.5 w-full font-['JetBrains_Mono']">Thông Số Bố Cục</h4>
                              
                              <div className="grid grid-cols-2 gap-4 w-full">
                                <div>
                                  <label className="block text-[9px] font-bold text-[#9a8f84] uppercase mb-1 font-['JetBrains_Mono']">Số Hàng (A-Z)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="26"
                                    className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-2.5 py-1.5 text-xs text-[#e6e1df] focus:ring-1 focus:ring-[#e2c19b]/30"
                                    value={builderRows}
                                    onChange={(e) => setBuilderRows(parseInt(e.target.value) || 8)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-[#9a8f84] uppercase mb-1 font-['JetBrains_Mono']">Ghế Mỗi Hàng</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-2.5 py-1.5 text-xs text-[#e6e1df] focus:ring-1 focus:ring-[#e2c19b]/30"
                                    value={builderCols}
                                    onChange={(e) => setBuilderCols(parseInt(e.target.value) || 12)}
                                  />
                                </div>
                              </div>

                              <div className="w-full">
                                <p className="text-[9px] text-[#9a8f84] mb-2 font-['JetBrains_Mono']">
                                  💡 **Bố cục mẫu**: Chọn sơ đồ thiết lập sẵn bên dưới.
                                </p>
                                <div className="flex flex-wrap gap-1.5 w-full">
                                  {TEMPLATE_PRESETS.map(preset => (
                                    <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() => handleApplyPresetTemplate(preset)}
                                      className="px-2 py-1 border border-[#4e453c] hover:border-[#e2c19b]/30 bg-[#211f1e] text-[9px] font-bold rounded-sm text-[#d1c4b8] hover:text-[#e6e1df] cursor-pointer"
                                    >
                                      {preset.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleGenerateBaseLayout}
                              className="inline-flex items-center gap-1.5 rounded-sm bg-[#e2c19b] text-[#412d11] px-5 py-2.5 text-xs font-bold font-['JetBrains_Mono'] uppercase hover:brightness-110 transition shadow-md shadow-[#e2c19b]/15 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm leading-none font-bold">refresh</span> Khởi Tạo Sơ Đồ
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Seating Grid */}
                            <div 
                              ref={seatGridRef}
                              className="flex flex-col gap-2 select-none w-full overflow-x-auto premium-scroll p-4 items-center bg-[#141312]/30 border border-[#4e453c]/40 rounded-sm"
                            >
                              {Object.entries(seatsByRow).map(([rowName, rowSeats]) => (
                                <div key={rowName} className="flex items-center gap-3 min-w-max">
                                  <span className="w-4 font-mono font-bold text-xs text-[#9a8f84] text-center shrink-0">{rowName}</span>
                                  
                                  <div className="flex items-center gap-1.5">
                                    {rowSeats.map((seat, seatIdx) => {
                                      const stConfig = SEAT_TYPE_CONFIGS[seat.customTypeName] || SEAT_TYPE_CONFIGS.STANDARD;
                                      const isSelected = selectedSeatIds.has(seat.uuid);
                                      const isAisle = aisleColumns.includes(seatIdx + 1);

                                      return (
                                        <React.Fragment key={seat.uuid}>
                                          {isAisle && (
                                            <div className="w-4 h-4 shrink-0 flex items-center justify-center text-[7px] text-[#9a8f84]/40 border border-dashed border-[#4e453c]/30 rounded-sm bg-[#0f0e0d]/10 select-none">
                                              ⇅
                                            </div>
                                          )}
                                          <button
                                            type="button"
                                            onMouseDown={() => handleSeatMouseDown(seat.uuid)}
                                            onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                            className={`w-4 h-4 rounded-sm text-[8px] font-bold flex items-center justify-center border font-mono transition-all duration-150 seat-item ${
                                              isSelected
                                                ? 'border-[#e2c19b] ring-1 ring-[#e2c19b]/40 bg-[#e2c19b]/25 text-[#e2c19b]'
                                                : `${stConfig.color} ${stConfig.border} ${stConfig.text} ${stConfig.glow}`
                                            }`}
                                            title={`${rowName}${seat.seatNumber} (${stConfig.label}) - ${seat.status}`}
                                          >
                                            {seat.seatNumber}
                                          </button>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>

                                  <span className="w-4 font-mono font-bold text-xs text-[#9a8f84] text-center shrink-0">{rowName}</span>
                                </div>
                              ))}
                            </div>

                            {/* Interactive Brush Selection / Legend */}
                            <div className="mt-12 flex flex-wrap gap-8 justify-center select-none">
                              {Object.entries(SEAT_TYPE_CONFIGS).map(([key, config]) => {
                                const isActiveBrush = activePaintBrushType === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      if (showBookingPreview) return;
                                      setActivePaintBrushType(key);
                                      if (selectedSeatIds.size > 0) handlePaintSelection(key);
                                    }}
                                    disabled={showBookingPreview}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all cursor-pointer text-left ${
                                      isActiveBrush && !showBookingPreview
                                        ? 'border-[#e2c19b] bg-[#e2c19b]/10 scale-105'
                                        : 'border-transparent bg-transparent opacity-85 hover:opacity-100'
                                    }`}
                                  >
                                    <div className={`h-3 w-3 rounded-sm shrink-0 border ${config.color} ${config.border}`} />
                                    <div className="leading-none">
                                      <span className="text-[10px] font-['JetBrains_Mono'] text-[#d1c4b8] uppercase block">{config.label}</span>
                                      {selectedSeatIds.size > 0 && isActiveBrush && !showBookingPreview && (
                                        <span className="text-[7px] text-[#e2c19b] font-bold font-mono">TÔ MÀU VÙNG CHỌN</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Operations bar: Save or discard */}
                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#4e453c]/30">
                      <p className="mr-auto text-[10px] text-[#9a8f84] font-['JetBrains_Mono'] uppercase flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm leading-none">history</span>
                        Lưu lần cuối: Vừa xong bởi quản trị viên
                      </p>
                      <button 
                        type="button"
                        onClick={() => fetchSeats(selectedRoom.uuid)}
                        className="px-6 py-2 bg-[#211f1e] text-[#e6e1df] border border-[#4e453c] font-['JetBrains_Mono'] text-xs uppercase hover:bg-[#2b2a28] transition-all cursor-pointer rounded-sm"
                      >
                        Hủy Bỏ Thay Đổi
                      </button>
                      <button 
                        type="button"
                        onClick={handleSaveAllConfiguration}
                        disabled={isSavingSeats || isSavingRoomConfig}
                        className="px-10 py-2 bg-[#e2c19b] text-[#412d11] font-bold font-['JetBrains_Mono'] text-xs uppercase cinematic-glow transition-all hover:brightness-110 cursor-pointer rounded-sm flex items-center gap-2"
                      >
                        {(isSavingSeats || isSavingRoomConfig) ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#412d11] border-t-transparent rounded-full animate-spin"></div>
                            Đang lưu...
                          </>
                        ) : (
                          'Lưu Cấu Hình'
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 border border-dashed border-[#4e453c] rounded-sm p-6 bg-[#141312]/55">
                    <span className="material-symbols-outlined text-[#e2c19b] text-4xl mb-3 opacity-20 animate-pulse leading-none">compass</span>
                    <p className="text-sm font-bold uppercase tracking-wider text-[#e6e1df] mb-1">Chưa chọn phòng chiếu</p>
                    <p className="text-xs text-[#9a8f84] font-['JetBrains_Mono']">Vui lòng chọn hoặc thêm mới phòng chiếu ở danh sách tabs phía trên.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Technical Standards Section (Asymmetric) */}
          <section className="mt-12 grid grid-cols-12 gap-6 text-left">
            <div className="col-span-12">
              <div className="bg-[#1d1b1a] border border-[#4e453c] p-8 flex flex-col md:flex-row gap-8 items-center rounded-sm">
                <div className="md:w-1/3">
                  <h2 className="font-['Bebas_Neue'] text-3xl text-[#e6e1df] mb-2 tracking-wider">Thông Số Kỹ Thuật</h2>
                  <p className="text-sm text-[#d1c4b8] leading-relaxed">
                    Xác định cấu hình phần cứng thiết bị chiếu phim và âm thanh cho phòng chiếu. Các phòng chiếu phải đạt tiêu chuẩn hiển thị và âm thanh quy chuẩn để hoạt động.
                  </p>
                </div>
                
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  {selectedRoom ? (
                    <>
                      {/* Projection */}
                      <div className="bg-[#211f1e] p-4 border border-[#4e453c]/30 hover:border-[#e2c19b]/50 transition-all rounded-sm">
                        <span className="material-symbols-outlined text-[#e2c19b] mb-2 leading-none">videocam</span>
                        <h4 className="text-xs font-bold uppercase mb-1 text-[#e6e1df]">Thiết Bị Chiếu</h4>
                        <input
                          type="text"
                          className="bg-[#0f0e0d] border border-[#4e453c]/50 hover:border-[#e2c19b]/30 focus:border-[#e2c19b] focus:ring-1 focus:ring-[#e2c19b]/20 text-[10.5px] text-[#d1c4b8] uppercase font-['JetBrains_Mono'] w-full py-1 px-2 mt-1 rounded-sm transition-all"
                          value={roomTechSpecs.projection}
                          onChange={(e) => setRoomTechSpecs({ ...roomTechSpecs, projection: e.target.value })}
                        />
                      </div>

                      {/* Audio Processor */}
                      <div className="bg-[#211f1e] p-4 border border-[#4e453c]/30 hover:border-[#e2c19b]/50 transition-all rounded-sm">
                        <span className="material-symbols-outlined text-[#e2c19b] mb-2 leading-none">surround_sound</span>
                        <h4 className="text-xs font-bold uppercase mb-1 text-[#e6e1df]">Bộ Xử Lý Âm Thanh</h4>
                        <input
                          type="text"
                          className="bg-[#0f0e0d] border border-[#4e453c]/50 hover:border-[#e2c19b]/30 focus:border-[#e2c19b] focus:ring-1 focus:ring-[#e2c19b]/20 text-[10.5px] text-[#d1c4b8] uppercase font-['JetBrains_Mono'] w-full py-1 px-2 mt-1 rounded-sm transition-all"
                          value={roomTechSpecs.audioProcessor}
                          onChange={(e) => setRoomTechSpecs({ ...roomTechSpecs, audioProcessor: e.target.value })}
                        />
                      </div>

                      {/* Screen Material */}
                      <div className="bg-[#211f1e] p-4 border border-[#4e453c]/30 hover:border-[#e2c19b]/50 transition-all rounded-sm">
                        <span className="material-symbols-outlined text-[#e2c19b] mb-2 leading-none">layers</span>
                        <h4 className="text-xs font-bold uppercase mb-1 text-[#e6e1df]">Chất Liệu Màn Hình</h4>
                        <input
                          type="text"
                          className="bg-[#0f0e0d] border border-[#4e453c]/50 hover:border-[#e2c19b]/30 focus:border-[#e2c19b] focus:ring-1 focus:ring-[#e2c19b]/20 text-[10.5px] text-[#d1c4b8] uppercase font-['JetBrains_Mono'] w-full py-1 px-2 mt-1 rounded-sm transition-all"
                          value={roomTechSpecs.screenMaterial}
                          onChange={(e) => setRoomTechSpecs({ ...roomTechSpecs, screenMaterial: e.target.value })}
                        />
                      </div>

                      {/* Seating Soft */}
                      <div className="bg-[#211f1e] p-4 border border-[#4e453c]/30 hover:border-[#e2c19b]/50 transition-all rounded-sm">
                        <span className="material-symbols-outlined text-[#e2c19b] mb-2 leading-none">chair</span>
                        <h4 className="text-xs font-bold uppercase mb-1 text-[#e6e1df]">Chất Liệu Đệm Ghế</h4>
                        <input
                          type="text"
                          className="bg-[#0f0e0d] border border-[#4e453c]/50 hover:border-[#e2c19b]/30 focus:border-[#e2c19b] focus:ring-1 focus:ring-[#e2c19b]/20 text-[10.5px] text-[#d1c4b8] uppercase font-['JetBrains_Mono'] w-full py-1 px-2 mt-1 rounded-sm transition-all"
                          value={roomTechSpecs.seatingSoft}
                          onChange={(e) => setRoomTechSpecs({ ...roomTechSpecs, seatingSoft: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-4 py-8 text-center text-[#9a8f84] border border-dashed border-[#4e453c] rounded-sm p-4 bg-[#0f0e0d]/20 w-full font-['JetBrains_Mono']">
                      <p className="text-xs uppercase tracking-wider">Chọn phòng chiếu để cấu hình thông số kỹ thuật</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ==================== CINEMA MODAL (ADD / EDIT BRANCH) ==================== */}
          {isCinemaModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsCinemaModalOpen(false)}></div>
              <div className="relative w-full max-w-md bg-[#1d1b1a] border border-[#4e453c] rounded-sm overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300">
                <div className="flex justify-between items-center mb-5 border-b border-[#4e453c]/45 pb-3">
                  <h2 className="text-sm font-bold text-[#e6e1df] uppercase tracking-wider flex items-center gap-2 font-['JetBrains_Mono']">
                    <Sparkles className="w-4 h-4 text-[#e2c19b]" />
                    {editingCinema ? 'Chỉnh Sửa Chi Nhánh' : 'Thêm Chi Nhánh Mới'}
                  </h2>
                  <button
                    onClick={() => setIsCinemaModalOpen(false)}
                    className="p-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <form onSubmit={handleCinemaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Tên Chi Nhánh Rạp *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#e2c19b]/50 transition-colors"
                      placeholder="Ví dụ: TPD Đống Đa"
                      value={cinemaFormData.name}
                      onChange={(e) => setCinemaFormData({ ...cinemaFormData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Địa Chỉ Chi Nhánh *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#e2c19b]/50 transition-colors"
                      placeholder="Địa chỉ chi tiết..."
                      value={cinemaFormData.address}
                      onChange={(e) => setCinemaFormData({ ...cinemaFormData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Số Điện Thoại Vận Hành *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#e2c19b]/50 transition-colors"
                      placeholder="Ví dụ: 1900 1080"
                      value={cinemaFormData.phoneNumber}
                      onChange={(e) => setCinemaFormData({ ...cinemaFormData, phoneNumber: e.target.value })}
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-[#4e453c]/45 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCinemaModalOpen(false)}
                      className="px-4 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-['JetBrains_Mono']"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-sm bg-[#e2c19b] text-[#412d11] text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md shadow-[#e2c19b]/10 font-['JetBrains_Mono']"
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
              <div className="relative w-full max-w-md bg-[#1d1b1a] border border-[#4e453c] rounded-sm overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300">
                <div className="flex justify-between items-center mb-5 border-b border-[#4e453c]/45 pb-3">
                  <h2 className="text-sm font-bold text-[#e6e1df] uppercase tracking-wider flex items-center gap-2 font-['JetBrains_Mono']">
                    <Tv className="w-4 h-4 text-[#e2c19b]" />
                    {editingRoom ? 'Chỉnh Sửa Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
                  </h2>
                  <button
                    onClick={() => setIsRoomModalOpen(false)}
                    className="p-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <form onSubmit={handleRoomSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Mã Phòng Chiếu *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#e2c19b]/50"
                      placeholder="Ví dụ: ROOM-IMAX-01"
                      value={roomFormData.roomCode}
                      onChange={(e) => setRoomFormData({ ...roomFormData, roomCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Tên Phòng Chiếu *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#e2c19b]/50"
                      placeholder="Ví dụ: Phòng Chiếu Số 1"
                      value={roomFormData.name}
                      onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Kiểu Phòng Chiếu *</label>
                      <select
                        className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#e2c19b]/50 cursor-pointer"
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
                      <label className="block text-[9px] font-bold text-[#9a8f84] uppercase tracking-wider mb-1.5 font-['JetBrains_Mono']">Trạng Thái Vận Hành *</label>
                      <select
                        className="w-full bg-[#0f0e0d] border border-[#4e453c] rounded-sm px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#e2c19b]/50 cursor-pointer"
                        value={roomFormData.status}
                        onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                      >
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                        <option value="DISABLED">Vô hiệu hóa</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#4e453c]/45 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsRoomModalOpen(false)}
                      className="px-4 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-['JetBrains_Mono']"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-sm bg-[#e2c19b] text-[#412d11] text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md shadow-[#e2c19b]/10 font-['JetBrains_Mono']"
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
              <div className="relative w-full max-w-lg bg-[#1d1b1a] border border-[#4e453c] rounded-sm overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300">
                <div className="flex justify-between items-center mb-4 border-b border-[#4e453c]/45 pb-3">
                  <h2 className="text-sm font-bold text-[#e6e1df] uppercase tracking-wider flex items-center gap-2 font-['JetBrains_Mono']">
                    <Upload className="w-4 h-4 text-[#e2c19b]" />
                    Nạp Sơ Đồ Thiết Kế Từ JSON
                  </h2>
                  <button
                    onClick={() => setIsImportExportOpen(false)}
                    className="p-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-[10px] text-gray-400 leading-relaxed font-['JetBrains_Mono']">
                    Dán chuỗi dữ liệu JSON sơ đồ ghế đã xuất trước đó vào khung dưới đây. Hệ thống sẽ tự động đối chiếu các cặp `rowName` và `seatNumber` để cập nhật cục bộ.
                  </p>
                  
                  <textarea
                    rows="8"
                    className="w-full rounded-sm bg-[#0f0e0d] border border-[#4e453c] p-3 font-mono text-xs text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-[#e2c19b]/50"
                    placeholder='[\n  {\n    "rowName": "A",\n    "seatNumber": 1,\n    "status": "ACTIVE",\n    "customTypeName": "STANDARD"\n  }\n]'
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                  />
                  
                  <div className="pt-4 border-t border-[#4e453c]/45 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsImportExportOpen(false)}
                      className="px-4 py-2 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-['JetBrains_Mono']"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleImportJson}
                      className="px-4 py-2 rounded-sm bg-[#e2c19b] text-[#412d11] text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md shadow-[#e2c19b]/10 font-['JetBrains_Mono']"
                    >
                      Nạp Bố Cục
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CinemasPage;

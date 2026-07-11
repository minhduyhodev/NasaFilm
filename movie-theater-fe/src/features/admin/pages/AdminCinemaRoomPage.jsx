import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, Tv, Activity, Grid, Loader2, RefreshCw, Download, Upload,
  Eye, Sliders, MousePointer, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import {
  FALLBACK_SEAT_TYPES,
  SEAT_TYPE_CONFIGS,
  TEMPLATE_PRESETS,
} from './cinemaSeatConstants';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import {
  EMPTY_AISLE_LAYOUT,
  parseLayoutConfig,
  serializeLayoutConfig,
  buildDefaultLayout,
  expandColsForDefaultAisles,
  buildLayoutFromAisleCols,
  slotKey,
  hasAisleSlot,
  addAisleSlots,
  removeAisleSlots,
  applyAisleSlotsToSeats,
  countBookableSeats,
  getAisleLabelAnchors,
  getCompleteVerticalCols,
  getCompleteHorizontalRows,
  getCompleteDiagonalCellKeys,
} from '../../../shared/utils/aisleLayoutUtils';
import {
  AISLE_LABEL,
  isCompleteAisleCell,
  isInCompleteVerticalCol,
  renderVerticalAisleCellProps,
} from '../../../shared/components/aisle/aisleMapRender';
import {
  buildRowPlacedItems,
  getCoupleLabel,
  isAnySeatSelected,
  getSeatMapGridStyle,
  getGridColumnStyle,
  seatNumberToGridColumn,
  computeHorizontalBandOverlays,
  getHorizontalBandOverlayStyle,
  getMaxSeatNumber,
  findInvalidCoupleSeats,
  resolveCouplePaintPair,
  collectCouplePaintTargets,
} from '../../../shared/utils/seatMapDisplay';
import '../../../shared/components/seatmap/SeatMapGrid.css';
import '../../../shared/components/aisle/AisleMapStyles.css';
import AdminModal from '../components/AdminModal';
import CinemaRoomFormPanel from '../components/panels/CinemaRoomFormPanel';

const deriveLayoutDimensions = (seats) => {
  if (!seats?.length) {
    return { rows: 8, cols: 12, activeCount: 0 };
  }

  // Use all seats (including DISABLED/AISLE ones) to determine grid dimensions
  const rowNames = [...new Set(seats.map((s) => s.rowName))].filter(Boolean).sort();
  const rowCount = rowNames.length || 8;
  const maxCol = Math.max(...seats.map((s) => s.seatNumber || 0), 1);

  // Active seats for booking (excluding aisles and physically disabled seats)
  const activeCount = seats.filter(
    (s) => s.status !== 'DISABLED' && s.customTypeName !== 'AISLE'
  ).length;

  return {
    rows: rowCount,
    cols: maxCol,
    activeCount,
  };
};

const AdminCinemaRoomPage = () => {
  const { cinemaUuid, roomUuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const confirm = useConfirm();

  const [cinema, setCinema] = useState(null);
  const [room, setRoom] = useState(null);
  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [selectedRoomSeats, setSelectedRoomSeats] = useState([]);
  const [originalSeats, setOriginalSeats] = useState([]); // Compare layout modifications

  // Loading indicator states
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSavingSeats, setIsSavingSeats] = useState(false);
  // Interactive Builder States
  const [selectedSeatIds, setSelectedSeatIds] = useState(new Set());
  const [activePaintBrushType, setActivePaintBrushType] = useState('SELECT'); // Pointer tool is default
  const [builderRows, setBuilderRows] = useState(8);
  const [builderCols, setBuilderCols] = useState(12);
  const [aisleLayout, setAisleLayout] = useState(EMPTY_AISLE_LAYOUT);
  const [originalAisleLayout, setOriginalAisleLayout] = useState(EMPTY_AISLE_LAYOUT);
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

  const loadPageData = async () => {
    setIsLoadingPage(true);
    try {
      const [cinemaDetail, roomList] = await Promise.all([
        cinemaService.getCinemaDetail(cinemaUuid),
        cinemaService.getRoomsByCinema(cinemaUuid),
      ]);
      const matchedRoom = (roomList || []).find((r) => r.uuid === roomUuid);
      if (!matchedRoom) {
        notificationService.error('Không tìm thấy phòng chiếu.');
        navigate(`/admin/cinemas?cinema=${cinemaUuid}`);
        return;
      }
      setCinema(cinemaDetail);
      setRoom(matchedRoom);
    } catch (error) {
      console.error('Failed to load room workspace:', error);
      notificationService.error('Không thể tải thông tin phòng chiếu.');
      navigate('/admin/cinemas');
    } finally {
      setIsLoadingPage(false);
    }
  };

  const fetchSeats = useCallback(async (targetRoomUuid, layoutConfigFromRoom) => {
    if (!targetRoomUuid) return;

    setIsLoadingSeats(true);
    setSelectedSeatIds(new Set());
    try {
      const data = await cinemaService.getSeatsByRoom(targetRoomUuid);
      const processedSeats = (data || []).map((seat) => {
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
          customTypeName: currentType,
        };
      });

      const { rows, cols: gridCols } = deriveLayoutDimensions(processedSeats);
      // Only apply stored layout; never invent default aisles on reload (would wipe MAINTENANCE).
      const layout = layoutConfigFromRoom
        ? parseLayoutConfig(layoutConfigFromRoom)
        : EMPTY_AISLE_LAYOUT();
      const aisleColCount = new Set(
        (layout.slots || []).map((k) => Number(String(k).split(':')[1])).filter((n) => !Number.isNaN(n)),
      ).size;
      setBuilderRows(rows);
      setBuilderCols(Math.max(1, gridCols - aisleColCount));
      const seatsWithAisles = applyAisleSlotsToSeats(processedSeats, layout);
      setSelectedRoomSeats(seatsWithAisles);
      setOriginalSeats(JSON.parse(JSON.stringify(seatsWithAisles)));
      setAisleLayout(layout);
      setOriginalAisleLayout(JSON.parse(JSON.stringify(layout)));
    } catch (error) {
      console.error('Failed to load seats for preview:', error);
      setSelectedRoomSeats([]);
      setOriginalSeats([]);
    } finally {
      setIsLoadingSeats(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [cinemaUuid, roomUuid, location.key]);

  useEffect(() => {
    if (searchParams.get('edit') === '1' && room && !isLoadingPage) {
      setEditRoomModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, room, isLoadingPage, setSearchParams]);

  useEffect(() => {
    if (!room?.uuid) {
      setSelectedRoomSeats([]);
      setOriginalSeats([]);
      return undefined;
    }
    fetchSeats(room.uuid, room.layoutConfig);
  }, [room?.uuid, room?.layoutConfig, fetchSeats]);

  const refreshRoomMeta = useCallback(async () => {
    const roomList = await cinemaService.getRoomsByCinema(cinemaUuid);
    const matchedRoom = (roomList || []).find((r) => r.uuid === roomUuid);
    if (matchedRoom) {
      setRoom((prev) => {
        if (
          prev?.uuid === matchedRoom.uuid
          && prev?.capacity === matchedRoom.capacity
          && prev?.name === matchedRoom.name
          && prev?.roomCode === matchedRoom.roomCode
          && prev?.roomType === matchedRoom.roomType
          && prev?.status === matchedRoom.status
          && prev?.layoutConfig === matchedRoom.layoutConfig
        ) {
          return prev;
        }
        return matchedRoom;
      });
    }
    return matchedRoom;
  }, [cinemaUuid, roomUuid]);

  const activeSeatCount = useMemo(
    () => countBookableSeats(selectedRoomSeats),
    [selectedRoomSeats],
  );

  const displayedCapacity = activeSeatCount > 0 ? activeSeatCount : (room?.capacity ?? 0);

  const expectedSeatCount = useMemo(() => {
    const rows = Number(builderRows) || 0;
    const cols = Number(builderCols) || 0;
    // builderCols = bookable seats per row (aisles are inserted as extra grid columns)
    return rows > 0 && cols > 0 ? rows * cols : 0;
  }, [builderRows, builderCols]);

  const seatsByRow = useMemo(() => {
    const rows = {};
    selectedRoomSeats.forEach(seat => {
      const r = seat.rowName || 'A';
      if (!rows[r]) rows[r] = [];
      rows[r].push(seat);
    });
    Object.keys(rows).forEach(r => {
      rows[r].sort((a, b) => (b.seatNumber || 0) - (a.seatNumber || 0));
    });
    return Object.keys(rows).sort().reduce((acc, key) => {
      acc[key] = rows[key];
      return acc;
    }, {});
  }, [selectedRoomSeats]);

  const rowNames = useMemo(() => Object.keys(seatsByRow).sort(), [seatsByRow]);

  const aisleLabelAnchors = useMemo(
    () => getAisleLabelAnchors(aisleLayout, seatsByRow, rowNames),
    [aisleLayout, seatsByRow, rowNames],
  );

  const maxSeatNumber = useMemo(
    () => getMaxSeatNumber(seatsByRow, rowNames),
    [seatsByRow, rowNames],
  );

  const completeVerticalCols = useMemo(
    () => getCompleteVerticalCols(aisleLayout, rowNames),
    [aisleLayout, rowNames],
  );

  const completeHorizontalRows = useMemo(
    () => getCompleteHorizontalRows(aisleLayout, seatsByRow, rowNames),
    [aisleLayout, seatsByRow, rowNames],
  );

  const completeDiagonalCells = useMemo(
    () => getCompleteDiagonalCellKeys(aisleLayout, seatsByRow, rowNames),
    [aisleLayout, seatsByRow, rowNames],
  );

  const syncAisleLayoutForSeats = useCallback((seats, paintType) => {
    const keys = seats.map((s) => slotKey(s.rowName, s.seatNumber));
    if (paintType === 'AISLE') {
      setAisleLayout((prev) => addAisleSlots(prev, keys));
    } else {
      setAisleLayout((prev) => removeAisleSlots(prev, keys));
    }
  }, []);

  // ---------- HANDLERS & ACTIONS ----------

  const handleEditRoomClick = () => {
    setEditRoomModalOpen(true);
  };

  const handleEditRoomSaved = async () => {
    setEditRoomModalOpen(false);
    await refreshRoomMeta();
  };

  const handleDeleteRoom = async () => {
    const confirmDelete = await confirm({
      title: 'Xóa phòng chiếu',
      message: `Bạn có chắc chắn muốn xóa phòng chiếu "${room.name}"? Hành động này sẽ xóa toàn bộ sơ đồ ghế của phòng chiếu và không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!confirmDelete) return;

    try {
      await cinemaService.deleteRoom(room.uuid);
      notificationService.success('Xóa phòng chiếu thành công');
      navigate(`/admin/cinemas?cinema=${cinemaUuid}`);
    } catch (err) {
      notificationService.error(err.message || 'Không thể xóa phòng chiếu');
    }
  };

  const handleBackToCinemas = () => {
    navigate(`/admin/cinemas?cinema=${cinemaUuid}`);
  };

  // Combined master configuration save handler (used by Save Configuration button)
  const handleSaveAllConfiguration = async () => {
    if (!room) return;
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
      await cinemaService.updateRoom(room.uuid, {
        roomCode: room.roomCode,
        name: room.name,
        roomType: room.roomType,
        capacity: activeSeatCount || room.capacity,
        status: room.status,
        layoutConfig: serializeLayoutConfig(aisleLayout),
      });

      setOriginalAisleLayout(JSON.parse(JSON.stringify(aisleLayout)));
      notificationService.success('Đã cập nhật cấu hình phòng chiếu và sơ đồ ghế thành công!');
      await refreshRoomMeta();
      fetchSeats(room.uuid, serializeLayoutConfig(aisleLayout));
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
      case 'AISLE':
        return { seatTypeUuid: seatTypesMap['STANDARD'], status: 'DISABLED' };
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
    const paintedSeats = selectedRoomSeats.filter((s) => selectedSeatIds.has(s.uuid));
    const aisleCheck = (s) => s.customTypeName === 'AISLE'
      || hasAisleSlot(aisleLayout, s.rowName, s.seatNumber);

    let targetUuids = [...selectedSeatIds];

    if (paintType === 'COUPLE') {
      const { uuids, errors } = collectCouplePaintTargets(
        paintedSeats,
        selectedRoomSeats,
        aisleCheck,
      );
      if (!uuids.length) {
        notificationService.error(errors[0] || 'Không thể tô sofa đôi cho các ghế đã chọn.');
        return;
      }
      targetUuids = uuids;
      if (errors.length) {
        notificationService.warning(`Một số ghế bỏ qua: ${errors.length} vị trí không đủ cặp 2 slot.`);
      }
    }

    const targetSet = new Set(targetUuids);
    const metaSeats = selectedRoomSeats.filter((s) => targetSet.has(s.uuid));

    if (paintType === 'AISLE') {
      syncAisleLayoutForSeats(
        metaSeats.map((s) => ({ rowName: s.rowName, seatNumber: s.seatNumber })),
        paintType,
      );
    } else if (paintType !== 'COUPLE') {
      syncAisleLayoutForSeats(
        metaSeats.map((s) => ({ rowName: s.rowName, seatNumber: s.seatNumber })),
        'STANDARD',
      );
    }

    setSelectedRoomSeats((prev) => prev.map((s) => {
      if (targetSet.has(s.uuid)) {
        return {
          ...s,
          seatTypeUuid,
          status,
          customTypeName: paintType,
        };
      }
      return s;
    }));

    setSelectedSeatIds(new Set());
    notificationService.success(`Đã tô màu ${targetSet.size} ghế thành loại: ${SEAT_TYPE_CONFIGS[paintType]?.label || paintType}`);
  }, [selectedSeatIds, selectedRoomSeats, getBackendDataForPaintType, syncAisleLayoutForSeats, aisleLayout]);

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
    if (!room) return;

    const invalidCouples = findInvalidCoupleSeats(selectedRoomSeats);
    if (invalidCouples.length > 0) {
      const sample = invalidCouples.slice(0, 3).map((s) => `${s.rowName}${s.seatNumber}`).join(', ');
      notificationService.error(
        `Không thể lưu: ${invalidCouples.length} ghế sofa thiếu cặp (cần 2 slot liền kề). VD: ${sample}`,
      );
      return;
    }

    setIsSavingSeats(true);
    try {
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

      // Always persist aisle layout + bookable capacity with seat saves.
      await cinemaService.updateRoom(room.uuid, {
        roomCode: room.roomCode,
        name: room.name,
        roomType: room.roomType,
        capacity: countBookableSeats(selectedRoomSeats) || room.capacity,
        status: room.status,
        layoutConfig: serializeLayoutConfig(aisleLayout),
      });

      setOriginalAisleLayout(JSON.parse(JSON.stringify(aisleLayout)));
      notificationService.success(
        modifiedSeats.length > 0
          ? `Đã cập nhật sơ đồ: ${modifiedSeats.length} ghế và cấu hình lối đi.`
          : 'Đã lưu cấu hình lối đi / sức chứa phòng.',
      );
      await refreshRoomMeta();
      fetchSeats(room.uuid, serializeLayoutConfig(aisleLayout));
    } catch (error) {
      console.error('Failed to save layout:', error);
      notificationService.error(error.message || 'Lỗi khi lưu sơ đồ ghế');
    } finally {
      setIsSavingSeats(false);
    }
  };

  // Re-generate layout mapping based on rows & columns settings
  const handleGenerateBaseLayout = async () => {
    if (!room) return;
    
    const finalRows = parseInt(builderRows) || 8;
    const finalCols = parseInt(builderCols) || 12;
    
    if (finalRows < 1 || finalRows > 26 || finalCols < 1 || finalCols > 30) {
      notificationService.error('Số hàng ghế phải từ 1 đến 26, số cột ghế phải từ 1 đến 30!');
      return;
    }

    const confirmRegen = await confirm({
      title: 'Khởi tạo lại sơ đồ ghế',
      message: `Cảnh báo: Việc khởi tạo lại sơ đồ ghế sẽ xóa sạch toàn bộ bố cục hiện tại của phòng "${room.name}". Bạn có chắc chắn muốn tiếp tục?`,
      confirmLabel: 'Khởi tạo lại',
      variant: 'warning',
    });
    if (!confirmRegen) return;

    setIsLoadingSeats(true);
    try {
      const { gridCols, aisleCols } = expandColsForDefaultAisles(finalCols);
      await cinemaService.generateSeats(room.uuid, finalRows, gridCols);

      const tempRowNames = Array.from({ length: finalRows }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      const newLayout = aisleCols.length
        ? buildLayoutFromAisleCols(aisleCols, tempRowNames)
        : EMPTY_AISLE_LAYOUT();
      const layoutJson = serializeLayoutConfig(newLayout);
      const bookableCapacity = finalRows * finalCols;

      await cinemaService.updateRoom(room.uuid, {
        roomCode: room.roomCode,
        name: room.name,
        roomType: room.roomType,
        capacity: bookableCapacity,
        status: room.status,
        layoutConfig: layoutJson,
      });

      setAisleLayout(newLayout);
      setOriginalAisleLayout(newLayout);

      await refreshRoomMeta();
      notificationService.success(
        aisleCols.length
          ? `Đã khởi tạo ${finalRows} hàng × ${finalCols} ghế bán được (+${aisleCols.length} cột lối đi).`
          : `Đã khởi tạo sơ đồ cơ sở ${finalRows} hàng × ${finalCols} ghế.`,
      );
      fetchSeats(room.uuid, layoutJson);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi thiết lập lại sơ đồ');
    } finally {
      setIsLoadingSeats(false);
    }
  };

  const applyLayoutDimensions = useCallback(async (rows, cols, presetLayout, presetId) => {
    if (!room) return false;

    const finalRows = parseInt(rows, 10) || 0;
    const finalCols = parseInt(cols, 10) || 0;

    if (finalRows < 1 || finalRows > 26 || finalCols < 1 || finalCols > 30) {
      notificationService.error('Số hàng ghế phải từ 1 đến 26, số cột ghế phải từ 1 đến 30!');
      return false;
    }

    setBuilderRows(finalRows);
    setBuilderCols(finalCols);
    if (presetLayout) {
      setAisleLayout(presetLayout);
    }

    setIsLoadingSeats(true);
    try {
      const { gridCols, aisleCols } = expandColsForDefaultAisles(finalCols, presetId);
      await cinemaService.generateSeats(room.uuid, finalRows, gridCols);
      const tempRowNames = Array.from({ length: finalRows }, (_, i) =>
        String.fromCharCode(65 + i),
      );
      const nextLayout = presetLayout
        ?? (aisleCols.length ? buildLayoutFromAisleCols(aisleCols, tempRowNames) : EMPTY_AISLE_LAYOUT());
      const layoutJson = serializeLayoutConfig(nextLayout);
      await cinemaService.updateRoom(room.uuid, {
        roomCode: room.roomCode,
        name: room.name,
        roomType: room.roomType,
        capacity: finalRows * finalCols,
        status: room.status,
        layoutConfig: layoutJson,
      });
      setAisleLayout(nextLayout);
      setOriginalAisleLayout(nextLayout);
      await refreshRoomMeta();
      notificationService.success(`Đã khởi tạo sơ đồ ${finalRows} hàng × ${finalCols} ghế bán được.`);
      await fetchSeats(room.uuid, layoutJson);
      return true;
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi thiết lập lại sơ đồ');
      return false;
    } finally {
      setIsLoadingSeats(false);
    }
  }, [room, refreshRoomMeta, fetchSeats]);

  // Preset layout: sync rows/cols/aisles and regenerate seats
  const handleApplyPresetTemplate = async (preset) => {
    const { aisleCols } = expandColsForDefaultAisles(preset.cols, preset.id);
    const tempRowNames = Array.from({ length: preset.rows }, (_, i) =>
      String.fromCharCode(65 + i),
    );
    const presetLayout = aisleCols.length
      ? buildLayoutFromAisleCols(aisleCols, tempRowNames)
      : EMPTY_AISLE_LAYOUT();

    const confirmApply = await confirm({
      title: `Áp dụng ${preset.name}`,
      message: `Thiết lập ${preset.rows} hàng × ${preset.cols} ghế bán được và khởi tạo lại sơ đồ? Sơ đồ hiện tại sẽ bị thay thế.`,
      confirmLabel: 'Áp dụng',
      variant: 'warning',
    });
    if (!confirmApply) {
      setBuilderRows(preset.rows);
      setBuilderCols(preset.cols);
      setAisleLayout(presetLayout);
      notificationService.info(`Đã cập nhật thông số ${preset.rows}×${preset.cols}. Nhấn "Khởi tạo lại sơ đồ" để sinh ghế.`);
      return;
    }

    await applyLayoutDimensions(preset.rows, preset.cols, presetLayout, preset.id);
  };

  // Clone layout from another room
  const handleCloneLayout = async (sourceRoomUuid) => {
    if (!room || !sourceRoomUuid) return;
    setIsLoadingSeats(true);
    try {
      const sourceSeats = await cinemaService.getSeatsByRoom(sourceRoomUuid);
      if (sourceSeats.length === 0) {
        notificationService.warning('Phòng nguồn chưa có sơ đồ ghế.');
        setIsLoadingSeats(false);
        return;
      }

      // First generate identical base dimensions
      const { rows, cols } = deriveLayoutDimensions(sourceSeats);
      await cinemaService.generateSeats(room.uuid, rows, cols);
      setBuilderRows(rows);
      setBuilderCols(cols);
      const sourceRowNames = [...new Set(sourceSeats.map((s) => s.rowName))].filter(Boolean).sort();
      setAisleLayout(buildDefaultLayout(cols, sourceRowNames));
      
      // Load the freshly generated seats to copy details into
      const freshSeats = await cinemaService.getSeatsByRoom(room.uuid);
      
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
      fetchSeats(room.uuid, serializeLayoutConfig(aisleLayout));
    } catch (error) {
      console.error('Failed to clone layout:', error);
      notificationService.error('Có lỗi xảy ra khi sao chép sơ đồ phòng.');
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // Export Room Layout JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify({
      version: 2,
      seats: selectedRoomSeats,
      aisleLayout,
    }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `layout_${cinema?.name.replace(/\s+/g, '_')}_${room?.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notificationService.success('Đã xuất file sơ đồ JSON thành công.');
  };

  // Import Room Layout JSON
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      let seatArray = parsed;
      let importedLayout = null;

      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.seats)) {
        seatArray = parsed.seats;
        importedLayout = parsed.aisleLayout ?? null;
      }

      if (!Array.isArray(seatArray)) throw new Error('File JSON không hợp lệ. Phải là một mảng ghế hoặc object có seats.');

      const testItem = seatArray[0];
      if (!testItem || !testItem.rowName || !testItem.seatNumber) {
        throw new Error('Cấu trúc phần tử ghế không chứa rowName hoặc seatNumber');
      }

      setSelectedRoomSeats(prev => prev.map(currentSeat => {
        const match = seatArray.find(
          imported => imported.rowName === currentSeat.rowName && imported.seatNumber === currentSeat.seatNumber
        );
        if (match) {
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

      if (importedLayout) {
        const parsed = parseLayoutConfig(importedLayout);
        setAisleLayout(parsed);
        setSelectedRoomSeats((prev) => applyAisleSlotsToSeats(prev, parsed));
      }

      setIsImportExportOpen(false);
      setImportJsonText('');
      notificationService.success('Đã nạp file sơ đồ tạm thời. Hãy nhấp "LƯU CẤU HÌNH" để ghi nhớ.');
    } catch (e) {
      notificationService.error(`Lỗi nạp sơ đồ: ${e.message}`);
    }
  };

  const paintSingleSeat = useCallback((uuid, paintType, seatMeta) => {
    const { seatTypeUuid, status } = getBackendDataForPaintType(paintType);
    const aisleCheck = (s) => s.customTypeName === 'AISLE'
      || hasAisleSlot(aisleLayout, s.rowName, s.seatNumber);

    let targetUuids = [uuid];

    if (paintType === 'COUPLE') {
      const seat = selectedRoomSeats.find((s) => s.uuid === uuid);
      const result = resolveCouplePaintPair(seat, selectedRoomSeats, aisleCheck);
      if (!result.ok) {
        notificationService.error(result.message);
        return;
      }
      targetUuids = result.targets.map((s) => s.uuid);
    }

    const targetSet = new Set(targetUuids);
    const metaSeats = targetUuids
      .map((id) => selectedRoomSeats.find((s) => s.uuid === id))
      .filter(Boolean);

    if (paintType === 'AISLE') {
      syncAisleLayoutForSeats(
        metaSeats.map((s) => ({ rowName: s.rowName, seatNumber: s.seatNumber })),
        paintType,
      );
    } else if (paintType !== 'COUPLE') {
      syncAisleLayoutForSeats(
        metaSeats.map((s) => ({ rowName: s.rowName, seatNumber: s.seatNumber })),
        'STANDARD',
      );
    }

    setSelectedRoomSeats((prev) => prev.map((s) => {
      if (targetSet.has(s.uuid)) {
        return {
          ...s,
          seatTypeUuid,
          status,
          customTypeName: paintType,
        };
      }
      return s;
    }));
  }, [getBackendDataForPaintType, syncAisleLayoutForSeats, selectedRoomSeats, aisleLayout]);

  const handleCoupleMouseDown = (seats) => {
    setIsDragSelecting(true);
    if (activePaintBrushType && activePaintBrushType !== 'SELECT') {
      seats.forEach((s) => {
        paintSingleSeat(s.uuid, activePaintBrushType, { rowName: s.rowName, seatNumber: s.seatNumber });
      });
    } else {
      setSelectedSeatIds((prev) => {
        const next = new Set(prev);
        const allSelected = seats.every((s) => next.has(s.uuid));
        seats.forEach((s) => {
          if (allSelected) next.delete(s.uuid);
          else next.add(s.uuid);
        });
        return next;
      });
    }
  };

  const handleCoupleMouseEnter = (seats) => {
    if (!isDragSelecting) return;
    if (activePaintBrushType && activePaintBrushType !== 'SELECT') {
      seats.forEach((s) => {
        paintSingleSeat(s.uuid, activePaintBrushType, { rowName: s.rowName, seatNumber: s.seatNumber });
      });
    } else {
      setSelectedSeatIds((prev) => {
        const next = new Set(prev);
        seats.forEach((s) => next.add(s.uuid));
        return next;
      });
    }
  };

  // Mouse Selection drag-select triggers
  const handleSeatMouseDown = (uuid, seatMeta) => {
    setIsDragSelecting(true);
    if (activePaintBrushType && activePaintBrushType !== 'SELECT') {
      paintSingleSeat(uuid, activePaintBrushType, seatMeta);
    } else {
      setSelectedSeatIds(prev => {
        const next = new Set(prev);
        if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
        return next;
      });
    }
  };

  const seatMetaByUuid = useMemo(() => {
    const map = new Map();
    selectedRoomSeats.forEach((s) => map.set(s.uuid, { rowName: s.rowName, seatNumber: s.seatNumber }));
    return map;
  }, [selectedRoomSeats]);

  const handleSeatMouseEnter = (uuid) => {
    if (isDragSelecting) {
      if (activePaintBrushType && activePaintBrushType !== 'SELECT') {
        paintSingleSeat(uuid, activePaintBrushType, seatMetaByUuid.get(uuid));
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
    const counts = { STANDARD: 0, VIP: 0, COUPLE: 0, BROKEN: 0, AISLE: 0 };
    selectedRoomSeats.forEach(s => {
      if (s.customTypeName) {
        counts[s.customTypeName] = (counts[s.customTypeName] || 0) + 1;
      }
    });
    return counts;
  }, [selectedRoomSeats]);

  const invalidCoupleSeats = useMemo(
    () => findInvalidCoupleSeats(selectedRoomSeats),
    [selectedRoomSeats],
  );

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleBackToCinemas}
            className="mt-1 p-2 rounded-lg border border-[#1A2238] bg-[#0B0F19] text-gray-400 hover:text-white hover:border-[#2C3B5E] transition cursor-pointer"
            title="Quay lại danh sách rạp"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Quản Lý Phòng Chiếu</h1>
            <p className="text-xs text-gray-400 mt-1">
              {cinema?.name || 'Đang tải...'} · {room?.name || '—'}
            </p>
          </div>
        </div>
        {room && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDeleteRoom}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400 hover:bg-red-500/20 transition cursor-pointer"
            >
              Xóa Phòng
            </button>
            <button
              type="button"
              onClick={handleEditRoomClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2238] bg-[#0B0F19] px-4 py-2 text-xs text-gray-300 hover:border-[#2C3B5E] hover:text-white transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Sửa Thông Tin Phòng
            </button>
          </div>
        )}
      </div>

      {isLoadingPage ? (
        <div className="flex justify-center items-center py-24 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Đang tải phòng chiếu...
        </div>
      ) : cinema && room ? (
        <div className="bg-[#0F1322] border border-[#1A2238] p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-4 border-b border-[#1A2238]/60 text-left">
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Mã phòng</span>
              <p className="text-xs text-white font-mono">{room.roomCode}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Loại phòng</span>
              <p className="text-xs text-white">{room.roomType}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Sức chứa</span>
              <p className="text-xs text-white">
                {displayedCapacity} ghế
                {activeSeatCount > 0 && room?.capacity != null && room.capacity !== activeSeatCount && (
                  <span className="text-amber-400/80 text-[10px] ml-1">(DB: {room.capacity})</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-500 block mb-1">Trạng thái</span>
              <p className={`text-xs font-bold ${room.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>{room.status}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase text-white tracking-wide">Sơ Đồ Ghế</h2>
              <p className="text-xs text-gray-500 mt-1">
                {room.name} · {room.roomType} · {cinema.name}
              </p>
            </div>
          </div>
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
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1 font-mono">Ghế bán / hàng</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          className="w-20 bg-[#0B0F19] border border-[#1A2238] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                          value={builderCols}
                          onChange={(e) => {
                            const val = e.target.value;
                            const parsed = val === '' ? '' : parseInt(val, 10) || 0;
                            setBuilderCols(parsed);
                            if (parsed !== '' && parsed > 0) {
                              const tempNames = Array.from({ length: builderRows || 8 }, (_, i) =>
                                String.fromCharCode(65 + i),
                              );
                              setAisleLayout(buildDefaultLayout(parsed, tempNames));
                            }
                          }}
                        />
                      </div>

                      {expectedSeatCount > 0 && (
                        <p className="text-[10px] text-gray-500 font-mono w-full">
                          Dự kiến: {builderRows}×{builderCols} = <strong className="text-white">{expectedSeatCount}</strong> ghế bán được
                          <span className="text-gray-500"> (lối đi thêm cột riêng)</span>
                          {activeSeatCount > 0 && activeSeatCount !== expectedSeatCount && (
                            <span className="text-amber-400 ml-1">· Hiện tại: {activeSeatCount} ghế</span>
                          )}
                        </p>
                      )}
                      
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
                          title={`${preset.desc} · ${preset.rows}×${preset.cols} ghế`}
                        >
                          {preset.name}
                          <span className="block text-[8px] font-normal text-gray-600 mt-0.5">{preset.rows}×{preset.cols}</span>
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
                          className="flex flex-col gap-2 select-none w-full overflow-x-auto overflow-y-visible premium-scroll p-6 py-8 items-center bg-[#0F1322]/40 border border-[#1A2238]/60 rounded-xl"
                        >
                          {invalidCoupleSeats.length > 0 && (
                            <div className="w-full max-w-3xl mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-medium flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                {invalidCoupleSeats.length} ghế sofa thiếu cặp
                                {' '}
                                (<strong className="text-yellow-300 font-mono">
                                  {invalidCoupleSeats.map((s) => `${s.rowName}${s.seatNumber}`).join(', ')}
                                </strong>
                                ) — viền vàng đứt nét trên bản đồ.
                                Sofa đôi bắt buộc 2 slot liền kề — tô cọ sofa sẽ tự chọn slot kế bên, hoặc đổi loại ghế lẻ trước khi lưu.
                              </span>
                            </div>
                          )}
                          {rowNames.map((rowName) => {
                            const rowSeats = seatsByRow[rowName] || [];
                            const isFullHorizontalAisle = completeHorizontalRows.includes(rowName);

                            const renderAisleHitTarget = (seat, extraClass = '') => {
                              const isSelected = selectedSeatIds.has(seat.uuid);
                              return (
                                <button
                                  key={seat.uuid}
                                  type="button"
                                  onMouseDown={() => handleSeatMouseDown(seat.uuid, { rowName, seatNumber: seat.seatNumber })}
                                  onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                  className={`relative z-10 w-full h-full aisle-slot-hit ${isSelected ? 'is-selected' : ''} ${extraClass}`}
                                  title={`Lối đi ${rowName}${seat.seatNumber}`}
                                  aria-label={`Lối đi ${rowName}${seat.seatNumber}`}
                                />
                              );
                            };

                            return (
                              <div key={rowName} className="flex items-center gap-3 min-w-max">
                                <span className="w-6 font-mono font-bold text-xs text-gray-400 text-center shrink-0 select-none">{rowName}</span>

                                {isFullHorizontalAisle ? (
                                  <div
                                    className="seat-map-grid seat-map-grid--admin"
                                    style={getSeatMapGridStyle(maxSeatNumber)}
                                  >
                                    {(() => {
                                      const bandOverlays = computeHorizontalBandOverlays(
                                        rowSeats,
                                        completeVerticalCols,
                                        maxSeatNumber,
                                      );
                                      const labelOverlayIdx = bandOverlays.length
                                        ? bandOverlays.reduce(
                                          (bestIdx, overlay, idx, arr) => (
                                            overlay.span > arr[bestIdx].span ? idx : bestIdx
                                          ),
                                          0,
                                        )
                                        : -1;

                                      return (
                                        <>
                                          {bandOverlays.map((overlay, idx) => (
                                            <div
                                              key={`h-band-${overlay.gridStart}`}
                                              className="seat-map-h-band aisle-band-complete aisle-band-horizontal-segment"
                                              style={getHorizontalBandOverlayStyle(overlay)}
                                            >
                                              {idx === labelOverlayIdx && (
                                                <span className="aisle-label-horizontal">{AISLE_LABEL}</span>
                                              )}
                                            </div>
                                          ))}
                                          {rowSeats.map((seat) => {
                                            const isCrossing = completeVerticalCols.includes(seat.seatNumber);
                                            return (
                                              <div
                                                key={seat.uuid}
                                                className="seat-map-grid-cell relative z-[1]"
                                                style={getGridColumnStyle(
                                                  seatNumberToGridColumn(seat.seatNumber, maxSeatNumber),
                                                )}
                                              >
                                                {renderAisleHitTarget(
                                                  seat,
                                                  isCrossing ? 'aisle-band-crossing z-0' : 'aisle-slot-ghost',
                                                )}
                                              </div>
                                            );
                                          })}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div
                                    className="seat-map-grid seat-map-grid--admin seat-map-row-seats"
                                    style={getSeatMapGridStyle(maxSeatNumber)}
                                  >
                                    {buildRowPlacedItems(
                                      rowSeats,
                                      maxSeatNumber,
                                      (seat) => seat.customTypeName === 'AISLE'
                                        || hasAisleSlot(aisleLayout, rowName, seat.seatNumber),
                                    ).map((item) => (
                                      <div
                                        key={item.key}
                                        className="seat-map-grid-cell relative z-[1]"
                                        style={getGridColumnStyle(item.gridStart, item.span)}
                                      >
                                        {item.kind === 'couple-invalid-ghost' ? (
                                          <div
                                            className="seat-couple-invalid-ghost flex items-center justify-center text-[8px] font-bold font-mono text-yellow-400/90"
                                            title={`Thiếu slot sofa đôi tại ${rowName}${item.seatNumber}`}
                                            aria-hidden
                                          >
                                            ?
                                          </div>
                                        ) : item.kind === 'couple-invalid' ? (() => {
                                          const seat = item.seats[0];
                                          const isSelected = selectedSeatIds.has(seat.uuid);
                                          return (
                                            <button
                                              type="button"
                                              onMouseDown={() => handleSeatMouseDown(seat.uuid, { rowName, seatNumber: seat.seatNumber })}
                                              onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                              className={`rounded-md text-[9px] font-bold flex items-center justify-center font-mono transition-all duration-150 seat-item cursor-pointer seat-couple-invalid ${
                                                isSelected ? 'ring-2 ring-yellow-300/70' : ''
                                              }`}
                                              title={`Sofa thiếu cặp — cần thêm 1 slot COUPLE liền kề (${rowName}${seat.seatNumber})`}
                                            >
                                              {`${rowName}${seat.seatNumber}`} !
                                            </button>
                                          );
                                        })() : item.kind === 'couple' ? (() => {
                                          const stConfig = SEAT_TYPE_CONFIGS.COUPLE;
                                          const isSelected = isAnySeatSelected(item.seats, selectedSeatIds);
                                          return (
                                            <button
                                              type="button"
                                              onMouseDown={() => handleCoupleMouseDown(item.seats)}
                                              onMouseEnter={() => handleCoupleMouseEnter(item.seats)}
                                              className={`rounded-md text-[9px] font-bold flex items-center justify-center border font-mono transition-all duration-150 seat-item cursor-pointer ${
                                                isSelected
                                                  ? 'border-red-500 ring-1 ring-red-500/40 bg-red-500/20 text-white'
                                                  : `${stConfig.color} ${stConfig.border} ${stConfig.text} ${stConfig.glow}`
                                              }`}
                                              title={`${getCoupleLabel(rowName, item.seats)} (${stConfig.label})`}
                                            >
                                              {getCoupleLabel(rowName, item.seats)}
                                            </button>
                                          );
                                        })() : (() => {
                                          const seat = item.seats[0];
                                          const isAisle = seat.customTypeName === 'AISLE'
                                            || hasAisleSlot(aisleLayout, rowName, seat.seatNumber);
                                          const isSelected = selectedSeatIds.has(seat.uuid);
                                          const inCompleteVert = isInCompleteVerticalCol(
                                            seat.seatNumber,
                                            completeVerticalCols,
                                          );
                                          const isComplete = isAisle && isCompleteAisleCell(
                                            rowName,
                                            seat.seatNumber,
                                            aisleLayout,
                                            completeVerticalCols,
                                            completeHorizontalRows,
                                          );
                                          const inCompleteDiag = completeDiagonalCells.has(
                                            slotKey(rowName, seat.seatNumber),
                                          );
                                          const showDiagonalBand = isAisle
                                            && aisleLabelAnchors.has(slotKey(rowName, seat.seatNumber))
                                            && inCompleteDiag
                                            && !inCompleteVert;

                                          const verticalCell = inCompleteVert
                                            ? renderVerticalAisleCellProps(
                                              rowName,
                                              seat.seatNumber,
                                              rowNames,
                                              aisleLayout,
                                              completeHorizontalRows,
                                              'admin',
                                            )
                                            : null;

                                          if (verticalCell) {
                                            return (
                                              <button
                                                type="button"
                                                onMouseDown={() => handleSeatMouseDown(seat.uuid, { rowName, seatNumber: seat.seatNumber })}
                                                onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                                className={`aisle-slot-hit flex items-center justify-center ${verticalCell.cellClass} ${verticalCell.showLabel ? 'overflow-visible' : ''} ${isSelected ? 'is-selected' : ''}`}
                                                title={`Lối đi ${rowName}${seat.seatNumber}`}
                                              >
                                                {verticalCell.showLabel && (
                                                  <div
                                                    className="aisle-label-vertical-wrap"
                                                    style={verticalCell.labelStyle}
                                                  >
                                                    <span className="aisle-label-vertical">{AISLE_LABEL}</span>
                                                  </div>
                                                )}
                                              </button>
                                            );
                                          }

                                          if (isComplete && inCompleteDiag && !showDiagonalBand) {
                                            return renderAisleHitTarget(seat, 'aisle-slot-ghost w-full h-full');
                                          }

                                          if (isComplete && showDiagonalBand) {
                                            return (
                                              <button
                                                type="button"
                                                onMouseDown={() => handleSeatMouseDown(seat.uuid, { rowName, seatNumber: seat.seatNumber })}
                                                onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                                className={`relative z-10 aisle-slot-hit ${isSelected ? 'is-selected' : ''}`}
                                                title={`Lối đi ${rowName}${seat.seatNumber}`}
                                              >
                                                <div className="absolute inset-0 aisle-band-complete flex items-center justify-center pointer-events-none">
                                                  <span className="aisle-label-horizontal text-[10px] tracking-[0.3em]">{AISLE_LABEL}</span>
                                                </div>
                                              </button>
                                            );
                                          }

                                          if (isAisle) {
                                            return (
                                              <button
                                                type="button"
                                                onMouseDown={() => handleSeatMouseDown(seat.uuid, { rowName, seatNumber: seat.seatNumber })}
                                                onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                                className={`rounded-md flex items-center justify-center transition-all duration-150 seat-item cursor-pointer aisle-slot-incomplete ${isSelected ? 'ring-2 ring-red-500/40' : ''}`}
                                                title={`Lối đi (chưa hoàn chỉnh) ${rowName}${seat.seatNumber}`}
                                              />
                                            );
                                          }

                                          const stConfig = SEAT_TYPE_CONFIGS[seat.customTypeName] || SEAT_TYPE_CONFIGS.STANDARD;
                                          return (
                                            <button
                                              type="button"
                                              onMouseDown={() => handleSeatMouseDown(seat.uuid, { rowName, seatNumber: seat.seatNumber })}
                                              onMouseEnter={() => handleSeatMouseEnter(seat.uuid)}
                                              className={`rounded-md text-[9px] font-bold flex items-center justify-center border font-mono transition-all duration-150 seat-item cursor-pointer ${
                                                isSelected
                                                  ? 'border-red-500 ring-1 ring-red-500/40 bg-red-500/20 text-white'
                                                  : `${stConfig.color} ${stConfig.border} ${stConfig.text} ${stConfig.glow}`
                                              }`}
                                              title={`${rowName}${seat.seatNumber} (${stConfig.label}) - ${seat.status}`}
                                            >
                                              {`${rowName}${seat.seatNumber}`}
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <span className="w-6 font-mono font-bold text-xs text-gray-400 text-center shrink-0 select-none">{rowName}</span>
                              </div>
                            );
                          })}
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
                                ) : key === 'AISLE' ? (
                                  <div className={`h-3 w-3 rounded shrink-0 ${config.color}`} />
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
                          <span>Đôi: <strong className="text-fuchsia-400">{Math.floor(((seatCounts.COUPLE || 0) - invalidCoupleSeats.length) / 2)} sofa</strong> ({seatCounts.COUPLE || 0} slot{invalidCoupleSeats.length > 0 ? `, ${invalidCoupleSeats.length} lẻ` : ''})</span>
                          <span>•</span>
                          <span>Bảo Trì: <strong className="text-zinc-500">{seatCounts.BROKEN || 0}</strong></span>
                          <span>•</span>
                          <span>Lối đi: <strong className="text-slate-300">{seatCounts.AISLE || 0}</strong></span>
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
                    onClick={() => fetchSeats(room.uuid, room?.layoutConfig)}
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
        </div>
      ) : null}

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
      <AdminModal
        open={editRoomModalOpen}
        onClose={() => setEditRoomModalOpen(false)}
        title="Chỉnh sửa phòng chiếu"
        subtitle={cinema?.name}
        size="lg"
      >
        {room && (
          <CinemaRoomFormPanel
            cinemaUuid={cinemaUuid}
            cinemaName={cinema?.name}
            room={room}
            onSuccess={handleEditRoomSaved}
            onCancel={() => setEditRoomModalOpen(false)}
          />
        )}
      </AdminModal>
    </>
  );
};

export default AdminCinemaRoomPage;

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Milestone } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { CounterSelectDropdown } from './CounterSelectDropdown';

export default function CounterLocationToolbar({ className = '' }) {
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinemaUuid, setSelectedCinemaUuid] = useState(
    localStorage.getItem('counter_cinema_uuid') || '',
  );
  const [selectedRoomUuid, setSelectedRoomUuid] = useState(
    localStorage.getItem('counter_room_uuid') || '',
  );

  useEffect(() => {
    let cancelled = false;
    cinemaService.getCinemasWithRooms('', 0, 100)
      .then((data) => {
        if (cancelled) return;
        const list = data || [];
        setCinemas(list);

        if (!list.length) return;

        let cinemaUuid = selectedCinemaUuid;
        if (!cinemaUuid || !list.some((c) => c.uuid === cinemaUuid)) {
          cinemaUuid = list[0].uuid;
          setSelectedCinemaUuid(cinemaUuid);
          localStorage.setItem('counter_cinema_uuid', cinemaUuid);
        }

        const cinema = list.find((c) => c.uuid === cinemaUuid);
        if (cinema?.rooms?.length) {
          let roomUuid = selectedRoomUuid;
          if (!roomUuid || !cinema.rooms.some((r) => r.uuid === roomUuid)) {
            roomUuid = cinema.rooms[0].uuid;
            setSelectedRoomUuid(roomUuid);
            localStorage.setItem('counter_room_uuid', roomUuid);
          }
        }
      })
      .catch((err) => console.error('Failed to load cinemas for counter toolbar:', err));

    return () => { cancelled = true; };
  }, [selectedCinemaUuid, selectedRoomUuid]);

  const activeCinema = cinemas.find((c) => c.uuid === selectedCinemaUuid);
  const rooms = activeCinema?.rooms || [];

  const cinemaOptions = useMemo(
    () => cinemas.map((cinema) => ({ value: cinema.uuid, label: cinema.name })),
    [cinemas],
  );

  const roomOptions = useMemo(
    () => rooms.map((room) => ({
      value: room.uuid,
      label: `${room.name} (${room.roomType})`,
    })),
    [rooms],
  );

  const emitLocationChange = (cinemaUuid, roomUuid) => {
    window.dispatchEvent(new CustomEvent('counter-location-changed', {
      detail: { cinemaUuid, roomUuid },
    }));
  };

  const handleCinemaChange = (cinemaUuid) => {
    setSelectedCinemaUuid(cinemaUuid);
    localStorage.setItem('counter_cinema_uuid', cinemaUuid);

    const cinema = cinemas.find((c) => c.uuid === cinemaUuid);
    if (cinema?.rooms?.length) {
      const roomUuid = cinema.rooms[0].uuid;
      setSelectedRoomUuid(roomUuid);
      localStorage.setItem('counter_room_uuid', roomUuid);
      emitLocationChange(cinemaUuid, roomUuid);
    } else {
      setSelectedRoomUuid('');
      localStorage.removeItem('counter_room_uuid');
      emitLocationChange(cinemaUuid, '');
    }
  };

  const handleRoomChange = (roomUuid) => {
    setSelectedRoomUuid(roomUuid);
    localStorage.setItem('counter_room_uuid', roomUuid);
    emitLocationChange(selectedCinemaUuid, roomUuid);
  };

  if (!cinemas.length) return null;

  return (
    <div className={`counter-location-toolbar ${className}`.trim()}>
      <CounterSelectDropdown
        id="admin-counter-cinema"
        variant="header"
        label="Chọn rạp"
        leadingIcon={Building2}
        value={selectedCinemaUuid}
        options={cinemaOptions}
        placeholder="Chọn rạp"
        emptyMessage="Chưa có rạp"
        onChange={handleCinemaChange}
        menuMinWidth={240}
      />
      <CounterSelectDropdown
        id="admin-counter-room"
        variant="header"
        label="Chọn phòng chiếu"
        leadingIcon={Milestone}
        value={selectedRoomUuid}
        options={roomOptions}
        placeholder="Chọn phòng"
        emptyMessage="Không có phòng"
        disabled={rooms.length === 0}
        onChange={handleRoomChange}
        menuMinWidth={260}
      />
    </div>
  );
}

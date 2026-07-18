import { useEffect, useMemo, useState } from 'react';
import { Building2, Milestone } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { CounterSelectDropdown } from './CounterSelectDropdown';

export default function CounterLocationToolbar({
  className = '',
  cinemaLabel = 'Chọn rạp',
  roomLabel = 'Chọn phòng chiếu',
  /** Empty default like Ngày: show label until user picks a value. */
  allowEmptyCinema = false,
  cinemaEmptyLabel = 'Rạp',
  allowEmptyRoom = false,
  roomEmptyLabel = 'Phòng chiếu',
}) {
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinemaUuid, setSelectedCinemaUuid] = useState(() =>
    (allowEmptyCinema ? '' : localStorage.getItem('counter_cinema_uuid')) || '',
  );
  const [selectedRoomUuid, setSelectedRoomUuid] = useState(() =>
    (allowEmptyRoom ? '' : localStorage.getItem('counter_room_uuid')) || '',
  );

  useEffect(() => {
    if (!allowEmptyCinema && !allowEmptyRoom) return undefined;

    if (allowEmptyCinema) localStorage.removeItem('counter_cinema_uuid');
    if (allowEmptyRoom) localStorage.removeItem('counter_room_uuid');

    window.dispatchEvent(new CustomEvent('counter-location-changed', {
      detail: {
        cinemaUuid: allowEmptyCinema ? '' : (localStorage.getItem('counter_cinema_uuid') || ''),
        roomUuid: allowEmptyRoom ? '' : (localStorage.getItem('counter_room_uuid') || ''),
      },
    }));
    return undefined;
  }, [allowEmptyCinema, allowEmptyRoom]);

  useEffect(() => {
    let cancelled = false;
    cinemaService.getCinemasWithRooms('', 0, 100)
      .then((data) => {
        if (cancelled) return;
        const list = data || [];
        setCinemas(list);

        if (!list.length) return;

        let cinemaUuid = selectedCinemaUuid;
        const cinemaValid = cinemaUuid && list.some((c) => c.uuid === cinemaUuid);
        if (!cinemaValid) {
          if (allowEmptyCinema) {
            cinemaUuid = '';
            setSelectedCinemaUuid('');
            localStorage.removeItem('counter_cinema_uuid');
          } else {
            cinemaUuid = list[0].uuid;
            setSelectedCinemaUuid(cinemaUuid);
            localStorage.setItem('counter_cinema_uuid', cinemaUuid);
          }
        }

        const cinema = list.find((c) => c.uuid === cinemaUuid);
        if (cinema?.rooms?.length) {
          const roomValid = selectedRoomUuid && cinema.rooms.some((r) => r.uuid === selectedRoomUuid);
          if (!roomValid) {
            if (allowEmptyRoom) {
              setSelectedRoomUuid('');
              localStorage.removeItem('counter_room_uuid');
            } else {
              const roomUuid = cinema.rooms[0].uuid;
              setSelectedRoomUuid(roomUuid);
              localStorage.setItem('counter_room_uuid', roomUuid);
            }
          }
        } else if (allowEmptyRoom || !cinemaUuid) {
          setSelectedRoomUuid('');
          localStorage.removeItem('counter_room_uuid');
        }
      })
      .catch((err) => console.error('Failed to load cinemas for counter toolbar:', err));

    return () => { cancelled = true; };
  }, [selectedCinemaUuid, selectedRoomUuid, allowEmptyCinema, allowEmptyRoom]);

  const activeCinema = cinemas.find((c) => c.uuid === selectedCinemaUuid);
  const rooms = activeCinema?.rooms || [];

  const cinemaOptions = useMemo(() => {
    const list = cinemas.map((cinema) => ({ value: cinema.uuid, label: cinema.name }));
    if (allowEmptyCinema) {
      return [{ value: '', label: cinemaEmptyLabel }, ...list];
    }
    return list;
  }, [cinemas, allowEmptyCinema, cinemaEmptyLabel]);

  const roomOptions = useMemo(() => {
    const list = rooms.map((room) => ({
      value: room.uuid,
      label: `${room.name} (${room.roomType})`,
    }));
    if (allowEmptyRoom) {
      return [{ value: '', label: roomEmptyLabel }, ...list];
    }
    return list;
  }, [rooms, allowEmptyRoom, roomEmptyLabel]);

  const emitLocationChange = (cinemaUuid, roomUuid) => {
    window.dispatchEvent(new CustomEvent('counter-location-changed', {
      detail: { cinemaUuid, roomUuid },
    }));
  };

  const handleCinemaChange = (cinemaUuid) => {
    setSelectedCinemaUuid(cinemaUuid);
    if (cinemaUuid) {
      localStorage.setItem('counter_cinema_uuid', cinemaUuid);
    } else {
      localStorage.removeItem('counter_cinema_uuid');
    }

    if (allowEmptyRoom || allowEmptyCinema) {
      setSelectedRoomUuid('');
      localStorage.removeItem('counter_room_uuid');
      emitLocationChange(cinemaUuid, '');
      return;
    }

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
    if (roomUuid) {
      localStorage.setItem('counter_room_uuid', roomUuid);
    } else {
      localStorage.removeItem('counter_room_uuid');
    }
    emitLocationChange(selectedCinemaUuid, roomUuid);
  };

  if (!cinemas.length) return null;

  return (
    <div className={`counter-location-toolbar ${className}`.trim()}>
      <CounterSelectDropdown
        id="admin-counter-cinema"
        variant="header"
        label={cinemaLabel}
        leadingIcon={Building2}
        iconClassName="counter-header__dropdown-icon--cinema"
        value={selectedCinemaUuid}
        options={cinemaOptions}
        placeholder={allowEmptyCinema ? cinemaEmptyLabel : 'Chọn rạp'}
        emptyMessage="Chưa có rạp"
        onChange={handleCinemaChange}
        menuMinWidth={240}
      />
      <CounterSelectDropdown
        id="admin-counter-room"
        variant="header"
        label={roomLabel}
        leadingIcon={Milestone}
        iconClassName="counter-header__dropdown-icon--room"
        value={selectedRoomUuid}
        options={roomOptions}
        placeholder={allowEmptyRoom ? roomEmptyLabel : 'Chọn phòng'}
        emptyMessage="Không có phòng"
        disabled={!selectedCinemaUuid || rooms.length === 0}
        onChange={handleRoomChange}
        menuMinWidth={260}
      />
    </div>
  );
}

package com.thdpv.movietheater.orbit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.service.SeatGapValidationService;
import com.thdpv.movietheater.booking.service.SeatMapEventPublisher;
import com.thdpv.movietheater.booking.service.ShowtimeSeatService;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.entity.OrbitMember;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class OrbitRoomServiceTest {

    @Mock
    private OrbitRoomRepository orbitRoomRepository;
    @Mock
    private OrbitMemberRepository orbitMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ShowtimeRepository showtimeRepository;
    @Mock
    private ShowtimeSeatService showtimeSeatService;
    @Mock
    private BookingNativeRepository bookingNativeRepository;
    @Mock
    private SeatGapValidationService seatGapValidationService;
    @Mock
    private MissionService missionService;
    @Mock
    private SystemConfigService systemConfigService;
    @Mock
    private OrbitRoomBroadcaster orbitRoomBroadcaster;
    @Mock
    private SeatMapEventPublisher seatMapEventPublisher;
    @Mock
    private OrbitRoomLockHelper orbitRoomLockHelper;
    @Mock
    private OrbitRoomMissionHelper orbitRoomMissionHelper;
    @Mock
    private OrbitRoomResponseMapper orbitRoomResponseMapper;

    @InjectMocks
    private OrbitRoomService orbitRoomService;

    private UUID roomUuid;
    private UUID hostUuid;
    private UUID guestUuid;
    private OrbitRoom openRoom;

    @BeforeEach
    void setUp() {
        roomUuid = UUID.randomUUID();
        hostUuid = UUID.randomUUID();
        guestUuid = UUID.randomUUID();
        openRoom = new OrbitRoom();
        openRoom.setUuid(roomUuid);
        openRoom.setShowtimeUuid(UUID.randomUUID());
        openRoom.setHostUserUuid(hostUuid);
        openRoom.setMaxMembers(4);
        openRoom.setStatus(OrbitRoomStatus.OPEN);
        openRoom.setExpiresAt(OffsetDateTime.now().plusMinutes(30));

        ReflectionTestUtils.setField(orbitRoomService, "orbitEnabled", true);
        ReflectionTestUtils.setField(orbitRoomService, "roomTtlMinutes", 30);
        ReflectionTestUtils.setField(orbitRoomService, "checkoutTtlMinutes", 15);
    }

    @Test
    void getRoomShouldReturnPreviewForNonMemberOnOpenRoom() {
        User guest = new User();
        guest.setId(guestUuid);
        guest.setEmail("guest@example.com");

        when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(guest));
        when(orbitRoomRepository.findById(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, guestUuid)).thenReturn(Optional.empty());
        when(orbitMemberRepository.countByRoomUuid(roomUuid)).thenReturn(2L);

        OrbitRoomResponse response = orbitRoomService.getRoom("guest@example.com", roomUuid);

        assertEquals("OPEN", response.getStatus());
        assertFalse(response.isViewerMember());
        assertEquals(2, response.getMemberCount());
        assertTrue(response.getMembers().isEmpty());
    }

    @Test
    void getRoomShouldRejectNonMemberWhenRoomNotOpen() {
        User guest = new User();
        guest.setId(guestUuid);
        guest.setEmail("guest@example.com");
        openRoom.setStatus(OrbitRoomStatus.CHECKOUT);

        when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(guest));
        when(orbitRoomRepository.findById(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, guestUuid)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () ->
                orbitRoomService.getRoom("guest@example.com", roomUuid));

        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void joinRoomShouldRejectWhenRoomFull() {
        User guest = new User();
        guest.setId(guestUuid);
        guest.setEmail("guest@example.com");

        when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(guest));
        when(orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, guestUuid)).thenReturn(Optional.empty());
        when(orbitRoomRepository.findByIdForUpdate(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.countByRoomUuid(roomUuid)).thenReturn(4L);

        AppException ex = assertThrows(AppException.class, () ->
                orbitRoomService.joinRoom("guest@example.com", roomUuid));

        assertEquals(ErrorCode.BAD_REQUEST, ex.getErrorCode());
        verify(orbitMemberRepository, never()).save(any());
    }

    @Test
    void createRoomShouldRejectWhenHostHasActiveRoom() {
        User host = new User();
        host.setId(hostUuid);
        host.setEmail("host@example.com");

        when(userRepository.findByEmailIgnoreCase("host@example.com")).thenReturn(Optional.of(host));
        when(orbitRoomRepository.findByHostUserUuidAndStatusIn(
                eq(hostUuid), eq(List.of(OrbitRoomStatus.OPEN, OrbitRoomStatus.CHECKOUT))))
                .thenReturn(List.of(openRoom));

        com.thdpv.movietheater.orbit.dto.request.CreateOrbitRoomRequest request =
                new com.thdpv.movietheater.orbit.dto.request.CreateOrbitRoomRequest();
        request.setShowtimeUuid(UUID.randomUUID());
        request.setMaxMembers(4);

        AppException ex = assertThrows(AppException.class, () ->
                orbitRoomService.createRoom("host@example.com", request));

        assertEquals(ErrorCode.CONFLICT, ex.getErrorCode());
        verify(orbitRoomRepository, never()).save(any());
    }

    @Test
    void abortCheckoutShouldRevertRoomToOpen() {
        User host = new User();
        host.setId(hostUuid);
        host.setEmail("host@example.com");
        openRoom.setStatus(OrbitRoomStatus.CHECKOUT);

        OrbitMember hostMember = new OrbitMember();
        hostMember.setUserUuid(hostUuid);
        hostMember.setSeatUuidsJson("[\"00000000-0000-0000-0000-000000000001\"]");

        when(userRepository.findByEmailIgnoreCase("host@example.com")).thenReturn(Optional.of(host));
        when(orbitRoomRepository.findByIdForUpdate(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)).thenReturn(List.of(hostMember));
        when(bookingNativeRepository.transferSeatLocksFromUserToUser(
                eq(openRoom.getShowtimeUuid()), eq(hostUuid), eq(hostUuid), any(), any())).thenReturn(1);
        when(orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)).thenReturn(List.of(hostMember));

        OrbitRoomResponse response = orbitRoomService.abortCheckout("host@example.com", roomUuid);

        assertEquals("OPEN", response.getStatus());
        verify(seatMapEventPublisher).notifySeatMapUpdated(openRoom.getShowtimeUuid());
        verify(orbitRoomBroadcaster).notifyRoomUpdated(any());
    }
}

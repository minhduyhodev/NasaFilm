package com.thdpv.movietheater.orbit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.service.SeatMapEventPublisher;
import com.thdpv.movietheater.orbit.entity.OrbitMember;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class OrbitRoomServiceCheckoutLockTest {

    @Mock
    private OrbitRoomRepository orbitRoomRepository;
    @Mock
    private OrbitMemberRepository orbitMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private OrbitRoomLockHelper orbitRoomLockHelper;
    @Mock
    private OrbitRoomMissionHelper orbitRoomMissionHelper;
    @Mock
    private OrbitRoomBroadcaster orbitRoomBroadcaster;
    @Mock
    private OrbitRoomResponseMapper orbitRoomResponseMapper;
    @Mock
    private BookingNativeRepository bookingNativeRepository;
    @Mock
    private SeatMapEventPublisher seatMapEventPublisher;

    @InjectMocks
    private OrbitRoomService orbitRoomService;

    private UUID roomUuid;
    private UUID hostUuid;
    private OrbitRoom checkoutRoom;

    @BeforeEach
    void setUp() {
        roomUuid = UUID.randomUUID();
        hostUuid = UUID.randomUUID();
        checkoutRoom = new OrbitRoom();
        checkoutRoom.setUuid(roomUuid);
        checkoutRoom.setShowtimeUuid(UUID.randomUUID());
        checkoutRoom.setHostUserUuid(hostUuid);
        checkoutRoom.setStatus(OrbitRoomStatus.CHECKOUT);
        checkoutRoom.setExpiresAt(OffsetDateTime.now().plusMinutes(10));

        org.springframework.test.util.ReflectionTestUtils.setField(orbitRoomService, "orbitEnabled", true);
    }

    @Test
    void cancelRoomDuringCheckoutShouldReleaseLocksViaHelper() {
        User host = new User();
        host.setId(hostUuid);
        host.setEmail("host@example.com");

        OrbitMember member = new OrbitMember();
        member.setUserUuid(hostUuid);
        member.setSeatUuidsJson("[\"00000000-0000-0000-0000-000000000001\"]");

        when(userRepository.findByEmailIgnoreCase("host@example.com")).thenReturn(Optional.of(host));
        when(orbitRoomRepository.findById(roomUuid)).thenReturn(Optional.of(checkoutRoom));
        when(orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)).thenReturn(List.of(member));

        var response = orbitRoomService.cancelRoom("host@example.com", roomUuid);

        assertEquals("CANCELLED", response.getStatus());
        verify(orbitRoomLockHelper).releaseAllRoomLocks(eq(checkoutRoom), any(OffsetDateTime.class));
        verify(orbitRoomMissionHelper).rollbackAllMemberProgress(eq(roomUuid), any(OffsetDateTime.class));
    }
}

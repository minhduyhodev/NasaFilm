package com.thdpv.movietheater.orbit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.orbit.dto.request.CreateOrbitRoomRequest;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.service.OrbitRoomService;
import com.thdpv.movietheater.support.AbstractPostgresIntegrationTest;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;

@Transactional
class OrbitRoomIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final String HOST_EMAIL = "customer@test.local";
    private static final String GUEST_EMAIL = "orbit-guest@test.local";

    @Autowired
    private OrbitRoomService orbitRoomService;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private UserRepository userRepository;

    private UUID showtimeUuid;

    @BeforeEach
    void setUpShowtimeAndGuest() {
        Showtime showtime = showtimeRepository.findAll().stream()
                .filter(item -> item.getStatus() == ShowtimeStatus.OPEN_FOR_BOOKING)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No open showtime in test database"));
        showtimeUuid = showtime.getUuid();

        if (userRepository.findByEmailIgnoreCase(GUEST_EMAIL).isEmpty()) {
            User guest = new User();
            guest.setEmail(GUEST_EMAIL);
            guest.setPassword("123123");
            guest.setFullName("Orbit Guest");
            guest.setAuthProvider(AuthProvider.LOCAL);
            guest.setStatus(UserStatus.ACTIVE);
            userRepository.save(guest);
        }
    }

    @Test
    void createJoinAndCancelRoomShouldReturnCancelledResponse() {
        CreateOrbitRoomRequest request = new CreateOrbitRoomRequest();
        request.setShowtimeUuid(showtimeUuid);
        request.setMaxMembers(8);

        OrbitRoomResponse created = orbitRoomService.createRoom(HOST_EMAIL, request);
        assertEquals("OPEN", created.getStatus());
        assertEquals(1, created.getMemberCount());

        OrbitRoomResponse joined = orbitRoomService.joinRoom(GUEST_EMAIL, created.getUuid());
        assertEquals(2, joined.getMemberCount());
        assertTrue(joined.isViewerMember());

        OrbitRoomResponse cancelled = orbitRoomService.cancelRoom(HOST_EMAIL, created.getUuid());
        assertEquals("CANCELLED", cancelled.getStatus());
        assertEquals(created.getUuid(), cancelled.getUuid());

        OrbitRoomResponse idempotent = orbitRoomService.cancelRoom(HOST_EMAIL, created.getUuid());
        assertEquals("CANCELLED", idempotent.getStatus());
    }
}

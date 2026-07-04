package com.thdpv.movietheater.orbit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class OrbitTopicAccessServiceTest {

    @Mock
    private OrbitRoomRepository orbitRoomRepository;
    @Mock
    private OrbitMemberRepository orbitMemberRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private OrbitTopicAccessService orbitTopicAccessService;

    private UUID roomUuid;
    private UUID userUuid;
    private User user;
    private OrbitRoom openRoom;

    @BeforeEach
    void setUp() {
        roomUuid = UUID.randomUUID();
        userUuid = UUID.randomUUID();
        user = new User();
        user.setId(userUuid);
        user.setEmail("guest@example.com");

        openRoom = new OrbitRoom();
        openRoom.setUuid(roomUuid);
        openRoom.setStatus(OrbitRoomStatus.OPEN);
        openRoom.setExpiresAt(OffsetDateTime.now().plusMinutes(30));

        ReflectionTestUtils.setField(orbitTopicAccessService, "orbitEnabled", true);
    }

    @Test
    void canSubscribeShouldAllowGuestOnOpenRoom() {
        when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(user));
        when(orbitRoomRepository.findById(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)).thenReturn(Optional.empty());

        assertTrue(orbitTopicAccessService.canSubscribe("guest@example.com", roomUuid));
    }

    @Test
    void canSubscribeShouldDenyGuestOnCheckoutRoom() {
        openRoom.setStatus(OrbitRoomStatus.CHECKOUT);

        when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(user));
        when(orbitRoomRepository.findById(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)).thenReturn(Optional.empty());

        assertFalse(orbitTopicAccessService.canSubscribe("guest@example.com", roomUuid));
    }

    @Test
    void canSubscribeShouldAllowMemberOnCheckoutRoom() {
        openRoom.setStatus(OrbitRoomStatus.CHECKOUT);

        when(userRepository.findByEmailIgnoreCase("member@example.com")).thenReturn(Optional.of(user));
        when(orbitRoomRepository.findById(roomUuid)).thenReturn(Optional.of(openRoom));
        when(orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid))
                .thenReturn(Optional.of(new com.thdpv.movietheater.orbit.entity.OrbitMember()));

        assertTrue(orbitTopicAccessService.canSubscribe("member@example.com", roomUuid));
    }

    @Test
    void parseRoomUuidShouldExtractFromTopic() {
        assertTrue(orbitTopicAccessService.isOrbitTopic("/topic/orbit/" + roomUuid));
        assertEquals(roomUuid, orbitTopicAccessService.parseRoomUuid("/topic/orbit/" + roomUuid));
        assertFalse(orbitTopicAccessService.isOrbitTopic("/topic/showtimes/" + roomUuid + "/seats"));
    }
}

package com.thdpv.movietheater.config.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;
import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.cache.CatalogCacheEvictor;
import com.thdpv.movietheater.config.entity.SystemConfigEntry;
import com.thdpv.movietheater.config.repository.SystemConfigRepository;

@ExtendWith(MockitoExtension.class)
class SystemConfigServiceTest {

    @Mock
    private SystemConfigRepository repository;

    @Mock
    private CatalogCacheEvictor cacheEvictor;

    private SystemConfigService service;

    @BeforeEach
    void setUp() {
        service = new SystemConfigService(repository, new ObjectMapper(), cacheEvictor, null);
        ReflectionTestUtils.setField(service, "fallbackOnlinePrice", BigDecimal.valueOf(45_000));
    }

    @Test
    void saveConfigShouldNormalizeValidSeatLimit() {
        when(repository.findById("default")).thenReturn(Optional.empty());
        Map<String, Object> saved = service.saveConfig(Map.of("maxSeatsPerBooking", "12"));

        assertEquals(12, saved.get("maxSeatsPerBooking"));
        verify(repository).save(any(SystemConfigEntry.class));
        verify(cacheEvictor).evictSystemConfig();
    }

    @Test
    void saveConfigShouldRejectSeatLimitAboveTwenty() {
        AppException exception = assertThrows(AppException.class,
                () -> service.saveConfig(Map.of("maxSeatsPerBooking", 21)));

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        verify(repository, never()).save(any());
    }
}

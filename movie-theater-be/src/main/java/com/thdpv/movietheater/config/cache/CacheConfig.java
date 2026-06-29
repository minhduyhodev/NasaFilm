package com.thdpv.movietheater.config.cache;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "true", matchIfMissing = true)
    public CacheManager redisCacheManager(
            RedisConnectionFactory connectionFactory,
            @Value("${app.cache.movies-ttl-minutes:10}") long moviesTtlMinutes,
            @Value("${app.cache.genres-ttl-minutes:15}") long genresTtlMinutes,
            @Value("${app.cache.system-config-ttl-minutes:15}") long systemConfigTtlMinutes) {

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .build(),
                ObjectMapper.DefaultTyping.NON_FINAL);

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer))
                .disableCachingNullValues()
                .entryTtl(Duration.ofMinutes(moviesTtlMinutes));

        Map<String, RedisCacheConfiguration> perCache = new HashMap<>();
        perCache.put(CacheNames.MOVIES, defaults.entryTtl(Duration.ofMinutes(moviesTtlMinutes)));
        perCache.put(CacheNames.UPCOMING_MOVIES, defaults.entryTtl(Duration.ofMinutes(moviesTtlMinutes)));
        perCache.put(CacheNames.GENRES, defaults.entryTtl(Duration.ofMinutes(genresTtlMinutes)));
        perCache.put(CacheNames.SYSTEM_CONFIG, defaults.entryTtl(Duration.ofMinutes(systemConfigTtlMinutes)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(perCache)
                .build();
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "false")
    public CacheManager caffeineCacheManager(
            @Value("${app.cache.movies-ttl-minutes:10}") long moviesTtlMinutes,
            @Value("${app.cache.genres-ttl-minutes:15}") long genresTtlMinutes,
            @Value("${app.cache.system-config-ttl-minutes:15}") long systemConfigTtlMinutes) {

        CaffeineCacheManager manager = new CaffeineCacheManager(
                CacheNames.MOVIES,
                CacheNames.UPCOMING_MOVIES,
                CacheNames.GENRES,
                CacheNames.SYSTEM_CONFIG);

        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(moviesTtlMinutes, TimeUnit.MINUTES)
                .maximumSize(500));

        manager.registerCustomCache(CacheNames.GENRES, Caffeine.newBuilder()
                .expireAfterWrite(genresTtlMinutes, TimeUnit.MINUTES)
                .maximumSize(50)
                .build());

        manager.registerCustomCache(CacheNames.SYSTEM_CONFIG, Caffeine.newBuilder()
                .expireAfterWrite(systemConfigTtlMinutes, TimeUnit.MINUTES)
                .maximumSize(10)
                .build());

        return manager;
    }
}

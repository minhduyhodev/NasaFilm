package com.thdpv.movietheater.config.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.config.entity.SystemConfigEntry;

public interface SystemConfigRepository extends JpaRepository<SystemConfigEntry, String> {
}

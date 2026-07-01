package com.thdpv.movietheater.mission.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.mission.entity.MissionProgressEvent;

public interface MissionProgressEventRepository extends JpaRepository<MissionProgressEvent, UUID> {
}

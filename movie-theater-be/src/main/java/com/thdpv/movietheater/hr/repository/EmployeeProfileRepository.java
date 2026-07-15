package com.thdpv.movietheater.hr.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.EmployeeProfile;

public interface EmployeeProfileRepository extends JpaRepository<EmployeeProfile, UUID> {

    Optional<EmployeeProfile> findByUserUuid(UUID userUuid);

    List<EmployeeProfile> findByUserUuidIn(Collection<UUID> userUuids);
}

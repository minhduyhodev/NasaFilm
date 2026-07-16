package com.thdpv.movietheater.booking.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.thdpv.movietheater.booking.entity.Combo;

public interface ComboRepository extends JpaRepository<Combo, UUID> {
    List<Combo> findByStatusIgnoreCaseOrderByNameAsc(String status);
}

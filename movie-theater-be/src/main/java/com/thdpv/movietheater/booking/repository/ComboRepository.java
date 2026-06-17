package com.thdpv.movietheater.booking.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.thdpv.movietheater.booking.entity.Combo;

@Repository
public interface ComboRepository extends JpaRepository<Combo, UUID> {
}

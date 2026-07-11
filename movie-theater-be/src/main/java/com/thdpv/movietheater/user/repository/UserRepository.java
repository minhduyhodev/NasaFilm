package com.thdpv.movietheater.user.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.enums.UserStatus;

import jakarta.persistence.LockModeType;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    @Query("""
            SELECT u FROM User u
            WHERE (:query IS NULL OR :query = '' OR
                   LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR
                   LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR
                   (u.phoneNumber IS NOT NULL AND u.phoneNumber LIKE CONCAT('%', :query, '%')))
              AND (:status IS NULL OR u.status = :status)
              AND NOT EXISTS (
                  SELECT 1 FROM UserRole ur JOIN ur.role r
                  WHERE ur.user = u AND r.name IN (
                      com.thdpv.movietheater.user.enums.RoleName.ADMIN,
                      com.thdpv.movietheater.user.enums.RoleName.STAFF
                  )
              )
            """)
    Page<User> searchCustomerUsers(
            @Param("query") String query,
            @Param("status") UserStatus status,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT u FROM UserRole ur
            JOIN ur.user u
            JOIN ur.role r
            WHERE r.name IN (
                      com.thdpv.movietheater.user.enums.RoleName.ADMIN,
                      com.thdpv.movietheater.user.enums.RoleName.STAFF
                  )
              AND (:query IS NULL OR :query = '' OR
                   LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR
                   LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR
                   (u.phoneNumber IS NOT NULL AND u.phoneNumber LIKE CONCAT('%', :query, '%')))
              AND (:status IS NULL OR u.status = :status)
            """)
    Page<User> searchStaffUsers(
            @Param("query") String query,
            @Param("status") UserStatus status,
            Pageable pageable);

    @Query("""
            SELECT COUNT(u) FROM User u
            WHERE NOT EXISTS (
                  SELECT 1 FROM UserRole ur JOIN ur.role r
                  WHERE ur.user = u AND r.name IN (
                      com.thdpv.movietheater.user.enums.RoleName.ADMIN,
                      com.thdpv.movietheater.user.enums.RoleName.STAFF
                  )
              )
            """)
    long countCustomers();

    @Query("""
            SELECT COUNT(u) FROM User u
            WHERE u.status = :status
              AND NOT EXISTS (
                  SELECT 1 FROM UserRole ur JOIN ur.role r
                  WHERE ur.user = u AND r.name IN (
                      com.thdpv.movietheater.user.enums.RoleName.ADMIN,
                      com.thdpv.movietheater.user.enums.RoleName.STAFF
                  )
              )
            """)
    long countCustomersByStatus(@Param("status") UserStatus status);

    @Query("""
            SELECT COUNT(u) FROM User u
            WHERE COALESCE(u.score, 0) >= :minScore
              AND NOT EXISTS (
                  SELECT 1 FROM UserRole ur JOIN ur.role r
                  WHERE ur.user = u AND r.name IN (
                      com.thdpv.movietheater.user.enums.RoleName.ADMIN,
                      com.thdpv.movietheater.user.enums.RoleName.STAFF
                  )
              )
            """)
    long countCustomersWithMinScore(@Param("minScore") int minScore);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    java.util.Optional<User> findByIdForUpdate(@Param("id") UUID id);
}

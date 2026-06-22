package com.thdpv.movietheater.notification.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.notification.entity.EmailTemplate;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, UUID> {

    Optional<EmailTemplate> findFirstByCodeIgnoreCaseAndActiveTrue(String code);

    Optional<EmailTemplate> findByCodeIgnoreCase(String code);

    List<EmailTemplate> findAllByOrderByCodeAsc();
}

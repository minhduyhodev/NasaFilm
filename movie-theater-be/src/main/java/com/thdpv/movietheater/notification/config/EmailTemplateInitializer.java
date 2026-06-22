package com.thdpv.movietheater.notification.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.notification.service.EmailTemplateService;

@Component
public class EmailTemplateInitializer implements CommandLineRunner {

    private final EmailTemplateService emailTemplateService;

    public EmailTemplateInitializer(EmailTemplateService emailTemplateService) {
        this.emailTemplateService = emailTemplateService;
    }

    @Override
    public void run(String... args) {
        emailTemplateService.ensureDefaultTemplates();
    }
}

package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.config.repository.RoleRepository;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    // Admin seed
    @Value("${app.auth.seed.admin-email}")
    private String adminEmail;

    @Value("${app.auth.seed.admin-password}")
    private String adminPassword;

    @Value("${app.auth.seed.admin-full-name}")
    private String adminFullName;

    // Staff seed
    @Value("${app.auth.seed.staff-email}")
    private String staffEmail;

    @Value("${app.auth.seed.staff-password}")
    private String staffPassword;

    @Value("${app.auth.seed.staff-full-name}")
    private String staffFullName;

    // Customer seed
    @Value("${app.auth.seed.customer-email}")
    private String customerEmail;

    @Value("${app.auth.seed.customer-password}")
    private String customerPassword;

    @Value("${app.auth.seed.customer-full-name}")
    private String customerFullName;

    public DataSeeder(RoleRepository roleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedRoles();
        seedAdminUser();
        seedStaffUser();
        seedCustomerUser();
    }

    private void seedRoles() {
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                role.setDescription(roleName.name() + " role");
                roleRepository.save(role);
                logger.info("Seeded role: {}", roleName);
            }
        }
    }

    private void seedAdminUser() {
        createUserIfNotExists(adminEmail, adminPassword, adminFullName, RoleName.ADMIN);
    }

    private void seedStaffUser() {
        createUserIfNotExists(staffEmail, staffPassword, staffFullName, RoleName.STAFF);
    }

    private void seedCustomerUser() {
        createUserIfNotExists(customerEmail, customerPassword, customerFullName, RoleName.CUSTOMER);
    }

    /**
     * Tạo user nếu chưa tồn tại trong DB, gán role tương ứng. Nếu đã tồn tại, cập
     * nhật mật khẩu và họ tên mới từ env.
     */
    private void createUserIfNotExists(String email, String password, String fullName, RoleName roleName) {
        java.util.Optional<User> existingUserOpt = userRepository.findByEmailIgnoreCase(email);
        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            user.setPassword(passwordEncoder.encode(password));
            user.setFullName(fullName);
            user.setAuthProvider(AuthProvider.LOCAL);
            user.setStatus(UserStatus.ACTIVE);
            userRepository.save(user);
            logger.info("Updated existing {} user '{}' details (password and name) from env configuration.",
                    roleName.name(), email);
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException(roleName.name() + " role not found"));

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRoleRepository.save(userRole);

        logger.info("Seeded {} user: {}", roleName.name(), email);
    }
}

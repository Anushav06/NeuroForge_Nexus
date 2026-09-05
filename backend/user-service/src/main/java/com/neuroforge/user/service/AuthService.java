package com.neuroforge.user.service;

import com.neuroforge.user.model.User;
import com.neuroforge.user.repository.UserRepository;
import com.neuroforge.user.security.JwtService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public AuthResult register(
            String name,
            String email,
            String password,
            String role,
            String subRole
    ) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        // New users should not be able to register themselves as ADMIN.
        // Default role is EMPLOYEE when no role is supplied.
        String safeRole = normalizeRole(role);

        String passwordHash = passwordEncoder.encode(password);

        User user = new User(
                null,
                name.trim(),
                email.trim().toLowerCase(),
                safeRole,
                subRole,
                "active",
                LocalDate.now().toString()
        );

        user.setPasswordHash(passwordHash);

        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser);

        return new AuthResult(savedUser, token);
    }

    public AuthResult login(
            String email,
            String password
    ) {

        if (email == null || email.isBlank()
                || password == null || password.isBlank()) {
            throw new IllegalArgumentException(
                    "Email and password are required"
            );
        }

        Optional<User> userOptional =
                userRepository.findByEmail(email.trim().toLowerCase());

        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException(
                    "Invalid email or password"
            );
        }

        User user = userOptional.get();

        if (!passwordEncoder.matches(
                password,
                user.getPasswordHash()
        )) {
            throw new IllegalArgumentException(
                    "Invalid email or password"
            );
        }

        if (user.getStatus() != null
                && !user.getStatus().equalsIgnoreCase("active")) {
            throw new IllegalArgumentException(
                    "User account is inactive"
            );
        }

        String token = jwtService.generateToken(user);

        return new AuthResult(user, token);
    }

    private String normalizeRole(String role) {

    if (role == null || role.isBlank()) {
        return "EMPLOYEE";
    }

    String normalized = role.trim().toUpperCase();

    return switch (normalized) {

        case "ADMIN" -> "ADMIN";

        case "PROJECT_LEAD" -> "PROJECT_LEAD";

        case "PROJECT_MANAGER" -> "PROJECT_MANAGER";

        case "TEAM_LEAD" -> "TEAM_LEAD";

        case "EMPLOYEE" -> "EMPLOYEE";

        // Support the roles mentioned in the project specification
        // by treating them as employees with a sub-role.
        case "DEVELOPER" -> "EMPLOYEE";

        case "TESTER" -> "EMPLOYEE";

        case "DEVOPS_ENGINEER" -> "EMPLOYEE";

        default -> "EMPLOYEE";
    };
}

    public static class AuthResult {

        private final User user;
        private final String token;

        public AuthResult(User user, String token) {
            this.user = user;
            this.token = token;
        }

        public User getUser() {
            return user;
        }

        public String getToken() {
            return token;
        }
    }
}
package com.neuroforge.user.controller;

import com.neuroforge.user.model.User;
import com.neuroforge.user.repository.UserRepository;
import com.neuroforge.user.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(
            AuthService authService,
            UserRepository userRepository
    ) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    // =========================
    // REGISTER
    // =========================

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request
    ) {

        try {

            AuthService.AuthResult result = authService.register(
                    request.name,
                    request.email,
                    request.password,
                    request.role,
                    request.subRole
            );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            new AuthResponse(
                                    result.getUser(),
                                    result.getToken()
                            )
                    );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // LOGIN
    // =========================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request
    ) {

        try {

            AuthService.AuthResult result =
                    authService.login(
                            request.email,
                            request.password
                    );

            return ResponseEntity.ok(
                    new AuthResponse(
                            result.getUser(),
                            result.getToken()
                    )
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // CURRENT USER
    // =========================

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            org.springframework.security.core.Authentication authentication
    ) {

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Unauthorized"));
        }

        String userId = authentication.getName();

        return userRepository
                .findById(userId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() ->
                        ResponseEntity
                                .status(HttpStatus.UNAUTHORIZED)
                                .body(
                                        Map.of(
                                                "message",
                                                "User not found"
                                        )
                                )
                );
    }

    // =========================
    // REQUEST CLASSES
    // =========================

    public static class RegisterRequest {

        public String name;
        public String email;
        public String password;
        public String role;
        public String subRole;
    }

    public static class LoginRequest {

        public String email;
        public String password;
    }

    // =========================
    // RESPONSE CLASS
    // =========================

    public static class AuthResponse {

        private final User user;
        private final String token;

        public AuthResponse(
                User user,
                String token
        ) {
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
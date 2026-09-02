package com.neuroforge.user.controller;

import com.neuroforge.user.model.User;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password."));
        }

        User user = userOpt.get();
        String token = "nf.jwt." + user.getId() + "." + System.currentTimeMillis();

        return ResponseEntity.ok(Map.of("token", token, "user", user));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        String name = (String) payload.get("name");
        String role = (String) payload.get("role");
        String subRole = (String) payload.get("subRole");

        if (email == null || userRepository.findByEmail(email.trim().toLowerCase()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "An account with this email already exists."));
        }

        User newUser = new User(
                "USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                name != null ? name.trim() : "New User",
                email.trim().toLowerCase(),
                role != null ? role : "EMPLOYEE",
                subRole,
                "active",
                LocalDate.now().toString()
        );

        userRepository.save(newUser);
        String token = "nf.jwt." + newUser.getId() + "." + System.currentTimeMillis();

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("token", token, "user", newUser));
    }
}
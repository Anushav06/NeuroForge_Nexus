package neuroforge_backend.controller;

import neuroforge_backend.dto.RegisterRequest;
import neuroforge_backend.model.User;
import neuroforge_backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody RegisterRequest request) {

        User user = new User();

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());
        user.setSubRole(request.getSubRole());

        User savedUser = userService.registerUser(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }
}
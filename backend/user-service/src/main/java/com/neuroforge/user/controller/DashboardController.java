package com.neuroforge.user.controller;

import com.neuroforge.user.repository.ProjectRepository;
import com.neuroforge.user.repository.TeamRepository;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public DashboardController(
            ProjectRepository projectRepository,
            TeamRepository teamRepository,
            UserRepository userRepository
    ) {
        this.projectRepository = projectRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        long totalProjects = projectRepository.count();
        long activeProjects = projectRepository.findAll().stream()
                .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .count();
        long totalUsers = userRepository.count();
        long totalTeams = teamRepository.count();

        return ResponseEntity.ok(Map.of(
                "activeProjects", activeProjects,
                "myProjects", totalProjects,
                "totalUsers", totalUsers,
                "totalTeams", totalTeams
        ));
    }
}
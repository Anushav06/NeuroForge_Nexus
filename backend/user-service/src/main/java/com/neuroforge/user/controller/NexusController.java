package com.neuroforge.user.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.neuroforge.user.model.Project;

import com.neuroforge.user.model.User;
import com.neuroforge.user.repository.ProjectRepository;
import com.neuroforge.user.repository.TeamRepository;
import com.neuroforge.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
public class NexusController {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;

    public NexusController(UserRepository userRepository, TeamRepository teamRepository, ProjectRepository projectRepository) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        long activeCount = projectRepository.findAll().stream()
                .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .count();

        return ResponseEntity.ok(Map.of(
                "scope", "organization",
                "activeProjects", activeCount,
                "myProjects", null,
                "totalUsers", userRepository.count(),
                "totalTeams", teamRepository.count()
        ));
    }

    @GetMapping("/users")
public List<User> getAllUsers() {
    return userRepository.findAll();
}

@GetMapping("/projects")
public List<Project> getAllProjects() {
    return projectRepository.findAll();
}

    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')")
@PostMapping("/projects")
public ResponseEntity<?> createProject(@RequestBody Project project) {
    if (project.getId() == null) {
            project.setId("PRJ-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        if (project.getCreatedAt() == null) {
            project.setCreatedAt(LocalDate.now().toString());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(projectRepository.save(project));
    }
}
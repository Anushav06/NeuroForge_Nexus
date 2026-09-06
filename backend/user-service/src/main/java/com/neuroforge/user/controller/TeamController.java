package com.neuroforge.user.controller;

import com.neuroforge.user.model.Team;
import com.neuroforge.user.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/teams")
@CrossOrigin(origins = "*")
public class TeamController {

    private final TeamRepository teamRepository;

    public TeamController(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    @GetMapping
    public ResponseEntity<List<Team>> getAllTeams() {
        return ResponseEntity.ok(teamRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTeamById(@PathVariable String id) {
        return teamRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(null));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')")
    public ResponseEntity<?> createTeam(@RequestBody Team team) {
        if (team.getName() == null || team.getName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Team name is required"));
        }
        Team saved = teamRepository.save(team);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
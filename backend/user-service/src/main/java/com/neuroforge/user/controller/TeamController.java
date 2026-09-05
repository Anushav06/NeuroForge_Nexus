package com.neuroforge.user.controller;

import com.neuroforge.user.model.Team;
import com.neuroforge.user.service.TeamService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    // =========================
    // CREATE TEAM
    // =========================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<?> createTeam(
            @RequestBody Team team
    ) {
        try {
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(teamService.createTeam(team));

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // GET ALL TEAMS
    // =========================

    @GetMapping
    public ResponseEntity<?> getAllTeams() {
        return ResponseEntity.ok(teamService.getAllTeams());
    }

    // =========================
    // GET TEAM
    // =========================

    @GetMapping("/{id}")
    public ResponseEntity<?> getTeam(
            @PathVariable String id
    ) {
        try {
            return ResponseEntity.ok(teamService.getTeam(id));

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // UPDATE TEAM
    // =========================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<?> updateTeam(
            @PathVariable String id,
            @RequestBody Team team
    ) {
        try {
            return ResponseEntity.ok(
                    teamService.updateTeam(id, team)
            );

        } catch (IllegalArgumentException e) {

            if ("Team not found".equals(e.getMessage())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", e.getMessage()));
            }

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // DELETE TEAM
    // =========================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<?> deleteTeam(
            @PathVariable String id
    ) {
        try {
            teamService.deleteTeam(id);
            return ResponseEntity.noContent().build();

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // ADD MEMBER
    // =========================

    @PostMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<?> addMember(
            @PathVariable String id,
            @RequestBody MemberRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    teamService.addMember(id, request.userId)
            );

        } catch (IllegalArgumentException e) {

            if (e.getMessage().contains("not found")) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", e.getMessage()));
            }

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // REMOVE MEMBER
    // =========================

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<?> removeMember(
            @PathVariable String id,
            @PathVariable String userId
    ) {
        try {
            return ResponseEntity.ok(
                    teamService.removeMember(id, userId)
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================
    // REQUEST CLASS
    // =========================

    public static class MemberRequest {
        public String userId;
    }
}
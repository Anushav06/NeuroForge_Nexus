package com.neuroforge.user.controller;

import com.neuroforge.user.model.Sprint;
import com.neuroforge.user.service.SprintService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/projects/{projectId}/sprints")
public class SprintController {

    private final SprintService sprintService;

    public SprintController(SprintService sprintService) {
        this.sprintService = sprintService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')")
    public ResponseEntity<?> createSprint(
            @PathVariable String projectId,
            @RequestBody Sprint sprint
    ) {
        try {
            Sprint createdSprint = sprintService.createSprint(projectId, sprint);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(createdSprint);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getSprints(
            @PathVariable String projectId
    ) {
        try {
            return ResponseEntity.ok(
                    sprintService.getSprintsByProject(projectId)
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSprint(
            @PathVariable String projectId,
            @PathVariable String id
    ) {
        try {
            Sprint sprint = sprintService.getSprint(id);

            if (!projectId.equals(sprint.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Sprint not found"));
            }

            return ResponseEntity.ok(sprint);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')")
    public ResponseEntity<?> updateSprint(
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestBody Sprint updatedSprint
    ) {
        try {
            Sprint existingSprint = sprintService.getSprint(id);

            if (!projectId.equals(existingSprint.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Sprint not found"));
            }

            Sprint updated = sprintService.updateSprint(id, updatedSprint);

            return ResponseEntity.ok(updated);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER')")
    public ResponseEntity<?> deleteSprint(
            @PathVariable String projectId,
            @PathVariable String id
    ) {
        try {
            Sprint existingSprint = sprintService.getSprint(id);

            if (!projectId.equals(existingSprint.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Sprint not found"));
            }

            sprintService.deleteSprint(id);

            return ResponseEntity.ok(
                    Map.of("message", "Sprint deleted successfully")
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
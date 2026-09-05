package com.neuroforge.user.controller;

import com.neuroforge.user.model.Task;
import com.neuroforge.user.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/projects/{projectId}/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD')")
    public ResponseEntity<?> createTask(
            @PathVariable String projectId,
            @RequestBody Task task
    ) {
        try {
            Task createdTask = taskService.createTask(projectId, task);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(createdTask);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getTasks(
            @PathVariable String projectId
    ) {
        try {
            return ResponseEntity.ok(
                    taskService.getTasksByProject(projectId)
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTask(
            @PathVariable String projectId,
            @PathVariable String id
    ) {
        try {
            Task task = taskService.getTask(id);

            if (!projectId.equals(task.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Task not found"));
            }

            return ResponseEntity.ok(task);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<?> getTasksBySprint(
            @PathVariable String projectId,
            @PathVariable String sprintId
    ) {
        try {
            return ResponseEntity.ok(
                    taskService.getTasksBySprint(projectId, sprintId)
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/subtasks")
    public ResponseEntity<?> getSubtasks(
            @PathVariable String projectId,
            @PathVariable String id
    ) {
        try {
            Task parentTask = taskService.getTask(id);

            if (!projectId.equals(parentTask.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Task not found"));
            }

            return ResponseEntity.ok(
                    taskService.getSubtasks(id)
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD')")
    public ResponseEntity<?> updateTask(
            @PathVariable String projectId,
            @PathVariable String id,
            @RequestBody Task updatedTask
    ) {
        try {
            Task existingTask = taskService.getTask(id);

            if (!projectId.equals(existingTask.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Task not found"));
            }

            return ResponseEntity.ok(
                    taskService.updateTask(id, updatedTask)
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sprint/{sprintId}/velocity")
    public ResponseEntity<?> getSprintVelocity(
            @PathVariable String projectId,
            @PathVariable String sprintId
    ) {
        try {
            int velocity = taskService.getSprintVelocity(
                    projectId,
                    sprintId
            );

            return ResponseEntity.ok(
                    Map.of(
                            "projectId", projectId,
                            "sprintId", sprintId,
                            "velocity", velocity
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sprint/{sprintId}/burndown")
    public ResponseEntity<?> getSprintBurndown(
            @PathVariable String projectId,
            @PathVariable String sprintId
    ) {
        try {
            return ResponseEntity.ok(
                    taskService.getSprintBurndown(
                            projectId,
                            sprintId
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_LEAD', 'PROJECT_MANAGER', 'TEAM_LEAD')")
    public ResponseEntity<?> deleteTask(
            @PathVariable String projectId,
            @PathVariable String id
    ) {
        try {
            Task existingTask = taskService.getTask(id);

            if (!projectId.equals(existingTask.getProjectId())) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Task not found"));
            }

            taskService.deleteTask(id);

            return ResponseEntity.ok(
                    Map.of("message", "Task deleted successfully")
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
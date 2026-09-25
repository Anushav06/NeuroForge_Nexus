package com.neuroforge.cicd.controller;

import com.neuroforge.cicd.model.Pipeline;
import com.neuroforge.cicd.service.PipelineService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class PipelineController {

    private final PipelineService pipelineService;

    public PipelineController(PipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    // =========================================================
    // GET ALL PIPELINES
    // All authenticated roles can view pipelines
    // =========================================================

    @PreAuthorize(
            "hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')"
    )
    @GetMapping("/projects/{projectId}/pipelines")
    public ResponseEntity<List<Pipeline>> getPipelines(
            @PathVariable String projectId) {

        return ResponseEntity.ok(
                pipelineService.getPipelinesByProject(projectId)
        );
    }

    // =========================================================
    // CREATE PIPELINE
    // =========================================================

    @PreAuthorize(
            "hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')"
    )
    @PostMapping("/projects/{projectId}/pipelines")
    public ResponseEntity<Pipeline> createPipeline(
            @PathVariable String projectId,
            @RequestBody Pipeline pipeline) {

        Pipeline created = pipelineService.createPipeline(
                projectId,
                pipeline
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(created);
    }

    // =========================================================
    // GET PIPELINE BY ID
    // All authenticated roles can view
    // =========================================================

    @PreAuthorize(
            "hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')"
    )
    @GetMapping("/pipelines/{id}")
    public ResponseEntity<Pipeline> getPipeline(
            @PathVariable String id) {

        return ResponseEntity.ok(
                pipelineService.getPipeline(id)
        );
    }

    // =========================================================
    // UPDATE PIPELINE
    // =========================================================

    @PreAuthorize(
            "hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')"
    )
    @PutMapping("/pipelines/{id}")
    public ResponseEntity<Pipeline> updatePipeline(
            @PathVariable String id,
            @RequestBody Pipeline pipeline) {

        return ResponseEntity.ok(
                pipelineService.updatePipeline(id, pipeline)
        );
    }

    // =========================================================
    // DELETE PIPELINE
    // =========================================================

    @PreAuthorize(
            "hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')"
    )
    @DeleteMapping("/pipelines/{id}")
    public ResponseEntity<Void> deletePipeline(
            @PathVariable String id) {

        pipelineService.deletePipeline(id);

        return ResponseEntity
                .noContent()
                .build();
    }

    // =========================================================
    // ENABLE / DISABLE PIPELINE
    // =========================================================

    @PreAuthorize(
            "hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')"
    )
    @PatchMapping("/pipelines/{id}/enabled")
    public ResponseEntity<Pipeline> updateEnabledStatus(
            @PathVariable String id,
            @RequestParam boolean enabled) {

        return ResponseEntity.ok(
                pipelineService.updateEnabledStatus(
                        id,
                        enabled
                )
        );
    }
}
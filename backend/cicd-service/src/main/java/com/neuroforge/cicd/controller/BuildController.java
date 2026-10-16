package com.neuroforge.cicd.controller;

import com.neuroforge.cicd.dto.StageUpdateRequest;
import com.neuroforge.cicd.dto.TriggerBuildRequest;
import com.neuroforge.cicd.model.Build;
import com.neuroforge.cicd.model.TestResult;
import com.neuroforge.cicd.service.BuildService;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
public class BuildController {

    private final BuildService buildService;

    public BuildController(BuildService buildService) {
        this.buildService = buildService;
    }

    // =========================
    // TRIGGER BUILD
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/pipelines/{pipelineId}/trigger")
    public ResponseEntity<Build> triggerBuild(
            @PathVariable String pipelineId,
            @RequestBody(required = false)
            TriggerBuildRequest request) {

        if (request == null) {
            request = new TriggerBuildRequest();
        }

        Build build =
                buildService.triggerBuild(
                        pipelineId,
                        request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(build);
    }

    // =========================
    // GET BUILDS
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/pipelines/{pipelineId}/builds")
    public ResponseEntity<Page<Build>> getBuilds(
            @PathVariable String pipelineId,

            @RequestParam(required = false)
            String status,

            @RequestParam(required = false)
            String branch,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int size) {

        return ResponseEntity.ok(
                buildService.getBuilds(
                        pipelineId,
                        status,
                        branch,
                        page,
                        size));
    }

    // =========================
    // GET SINGLE BUILD
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/builds/{buildId}")
    public ResponseEntity<Build> getBuild(
            @PathVariable String buildId) {

        return ResponseEntity.ok(
                buildService.getBuild(buildId));
    }

    // =========================
    // GET BUILD LOGS
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/builds/{buildId}/logs")
    public ResponseEntity<?> getLogs(
            @PathVariable String buildId,
            @RequestParam String stage) {

        return ResponseEntity.ok(
                buildService.getLogs(
                        buildId,
                        stage));
    }

    // =========================
    // CANCEL BUILD
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/builds/{buildId}/cancel")
    public ResponseEntity<Build> cancelBuild(
            @PathVariable String buildId) {

        return ResponseEntity.ok(
                buildService.cancelBuild(buildId));
    }

    // =========================
    // RETRY BUILD
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/builds/{buildId}/retry")
    public ResponseEntity<Build> retryBuild(
            @PathVariable String buildId) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        buildService.retryBuild(
                                buildId));
    }

    // =========================
    // UPDATE BUILD STAGE
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PatchMapping("/builds/{buildId}/stages/{stageName}")
    public ResponseEntity<Build> updateStage(
            @PathVariable String buildId,
            @PathVariable String stageName,
            @RequestBody StageUpdateRequest request) {

        return ResponseEntity.ok(
                buildService.updateStage(
                        buildId,
                        stageName,
                        request));
    }

    // =========================
    // SAVE TEST RESULTS
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/builds/{buildId}/test-results")
    public ResponseEntity<Build> saveTestResult(
            @PathVariable String buildId,
            @RequestBody TestResult testResult) {

        return ResponseEntity.ok(
                buildService.saveTestResult(
                        buildId,
                        testResult));
    }

    // =========================
    // GET TEST RESULTS
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/builds/{buildId}/test-results")
    public ResponseEntity<TestResult> getTestResult(
            @PathVariable String buildId) {

        return ResponseEntity.ok(
                buildService.getTestResult(buildId));
    }
}
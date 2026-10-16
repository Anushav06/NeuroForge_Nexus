package com.neuroforge.cicd.controller;

import com.neuroforge.cicd.dto.CicdStatsResponse;
import com.neuroforge.cicd.dto.CoverageTrendResponse;
import com.neuroforge.cicd.dto.PipelineHealthResponse;
import com.neuroforge.cicd.dto.PipelineMetricResponse;
import com.neuroforge.cicd.service.HealthMetricsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class HealthMetricsController {

    private final HealthMetricsService healthMetricsService;

    public HealthMetricsController(
            HealthMetricsService healthMetricsService
    ) {
        this.healthMetricsService =
                healthMetricsService;
    }

    @GetMapping("/pipelines/{pipelineId}/health")
    public ResponseEntity<PipelineHealthResponse> getPipelineHealth(
            @PathVariable String pipelineId
    ) {

        return ResponseEntity.ok(
                healthMetricsService.getPipelineHealth(
                        pipelineId
                )
        );
    }

    @GetMapping("/projects/{projectId}/cicd/stats")
    public ResponseEntity<CicdStatsResponse> getProjectStats(
            @PathVariable String projectId
    ) {

        return ResponseEntity.ok(
                healthMetricsService.getProjectStats(
                        projectId
                )
        );
    }

    @GetMapping("/pipelines/{pipelineId}/metrics")
    public ResponseEntity<List<PipelineMetricResponse>> getPipelineMetrics(
            @PathVariable String pipelineId,
            @RequestParam(defaultValue = "14") int days
    ) {

        return ResponseEntity.ok(
                healthMetricsService.getPipelineMetrics(
                        pipelineId,
                        days
                )
        );
    }

    @GetMapping("/pipelines/{pipelineId}/coverage-trend")
@PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
public ResponseEntity<List<CoverageTrendResponse>> getCoverageTrend(
        @PathVariable String pipelineId,
        @RequestParam(defaultValue = "20") int last) {

    return ResponseEntity.ok(
            healthMetricsService.getCoverageTrend(pipelineId, last)
    );
}
}
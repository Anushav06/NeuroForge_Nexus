package com.neuroforge.cicd.controller;

import com.neuroforge.cicd.dto.DeployRequest;
import com.neuroforge.cicd.dto.DeploymentHealthRequest;
import com.neuroforge.cicd.dto.RollbackRequest;
import com.neuroforge.cicd.model.Deployment;
import com.neuroforge.cicd.service.DeploymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class DeploymentController {

    private final DeploymentService deploymentService;

    public DeploymentController(
            DeploymentService deploymentService
    ) {
        this.deploymentService = deploymentService;
    }

    // Deploy a successful build
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/builds/{buildId}/deploy")
    public ResponseEntity<Deployment> deploy(
            @PathVariable String buildId,
            @RequestBody DeployRequest request
    ) {

        return ResponseEntity.ok(
                deploymentService.deploy(buildId, request)
        );
    }

    // Get project deployments
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/projects/{projectId}/deployments")
    public ResponseEntity<List<Deployment>> getProjectDeployments(
            @PathVariable String projectId,
            @RequestParam(required = false) String environment
    ) {

        return ResponseEntity.ok(
                deploymentService.getProjectDeployments(
                        projectId,
                        environment
                )
        );
    }

    // Get deployment by ID
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/deployments/{deploymentId}")
    public ResponseEntity<Deployment> getDeployment(
            @PathVariable String deploymentId
    ) {

        return ResponseEntity.ok(
                deploymentService.getDeployment(deploymentId)
        );
    }

    // Get current deployment for environment
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/environments/{environment}/current")
    public ResponseEntity<Deployment> getCurrentDeployment(
            @PathVariable String environment,
            @RequestParam String projectId
    ) {

        return ResponseEntity.ok(
                deploymentService.getCurrentDeployment(
                        projectId,
                        environment
                )
        );
    }

    // Update deployment health
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PatchMapping("/deployments/{deploymentId}/health")
    public ResponseEntity<Deployment> updateHealth(
            @PathVariable String deploymentId,
            @RequestBody DeploymentHealthRequest request
    ) {

        return ResponseEntity.ok(
                deploymentService.updateHealth(
                        deploymentId,
                        request
                )
        );
    }

    // Rollback deployment
@PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
@PostMapping("/deployments/{deploymentId}/rollback")
public ResponseEntity<Deployment> rollback(
        @PathVariable String deploymentId,
        @RequestBody RollbackRequest request
) {

    return ResponseEntity.ok(
            deploymentService.rollback(
                    deploymentId,
                    request.getRollbackReason()
            )
    );
}

// Get rollback history
@PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
@GetMapping("/projects/{projectId}/rollbacks")
public ResponseEntity<List<Deployment>> getRollbacks(
        @PathVariable String projectId
) {

    return ResponseEntity.ok(
            deploymentService.getRollbacks(projectId)
    );
}
}
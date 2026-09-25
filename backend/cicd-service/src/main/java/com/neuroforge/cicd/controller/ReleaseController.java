package com.neuroforge.cicd.controller;

import com.neuroforge.cicd.dto.ChangelogResponse;
import com.neuroforge.cicd.dto.CreateReleaseRequest;
import com.neuroforge.cicd.dto.UpdateReleaseRequest;
import com.neuroforge.cicd.model.Release;
import com.neuroforge.cicd.service.ReleaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ReleaseController {

    private final ReleaseService releaseService;

    public ReleaseController(
            ReleaseService releaseService
    ) {
        this.releaseService = releaseService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/projects/{projectId}/releases")
    public ResponseEntity<List<Release>> getProjectReleases(
            @PathVariable String projectId
    ) {

        return ResponseEntity.ok(
                releaseService.getProjectReleases(
                        projectId
                )
        );
    }

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/projects/{projectId}/releases")
    public ResponseEntity<Release> createRelease(
            @PathVariable String projectId,
            @RequestBody CreateReleaseRequest request
    ) {

        return ResponseEntity.ok(
                releaseService.createRelease(
                        projectId,
                        request
                )
        );
    }

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/releases/{releaseId}")
    public ResponseEntity<Release> getRelease(
            @PathVariable String releaseId
    ) {

        return ResponseEntity.ok(
                releaseService.getRelease(
                        releaseId
                )
        );
    }

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PutMapping("/releases/{releaseId}")
    public ResponseEntity<Release> updateRelease(
            @PathVariable String releaseId,
            @RequestBody UpdateReleaseRequest request
    ) {

        return ResponseEntity.ok(
                releaseService.updateRelease(
                        releaseId,
                        request
                )
        );
    }

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD')")
    @PostMapping("/releases/{releaseId}/publish")
    public ResponseEntity<Release> publishRelease(
            @PathVariable String releaseId,
            @RequestParam(required = false) String releasedBy
    ) {

        return ResponseEntity.ok(
                releaseService.publishRelease(
                        releaseId,
                        releasedBy
                )
        );
    }

    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_LEAD','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE')")
    @GetMapping("/releases/{releaseId}/changelog")
    public ResponseEntity<ChangelogResponse> getChangelog(
            @PathVariable String releaseId
    ) {

        return ResponseEntity.ok(
                releaseService.getChangelog(
                        releaseId
                )
        );
    }
}
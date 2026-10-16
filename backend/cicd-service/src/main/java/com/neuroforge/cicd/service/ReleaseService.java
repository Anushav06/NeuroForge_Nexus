package com.neuroforge.cicd.service;

import com.neuroforge.cicd.dto.ChangelogResponse;
import com.neuroforge.cicd.dto.CreateReleaseRequest;
import com.neuroforge.cicd.dto.UpdateReleaseRequest;
import com.neuroforge.cicd.exception.BadRequestException;
import com.neuroforge.cicd.exception.ResourceNotFoundException;
import com.neuroforge.cicd.model.Release;
import com.neuroforge.cicd.repository.ReleaseRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReleaseService {

    private final ReleaseRepository releaseRepository;

    public ReleaseService(
            ReleaseRepository releaseRepository
    ) {
        this.releaseRepository = releaseRepository;
    }

    public List<Release> getProjectReleases(
            String projectId
    ) {

        return releaseRepository
                .findByProjectIdOrderByVersionDesc(
                        projectId
                );
    }

    public Release createRelease(
            String projectId,
            CreateReleaseRequest request
    ) {

        if (request == null) {
            throw new BadRequestException(
                    "Release data is required"
            );
        }

        if (request.getVersion() == null ||
                request.getVersion().isBlank()) {

            throw new BadRequestException(
                    "Release version is required"
            );
        }

        if (releaseRepository
                .existsByProjectIdAndVersion(
                        projectId,
                        request.getVersion()
                )) {

            throw new BadRequestException(
                    "Release version already exists: "
                            + request.getVersion()
            );
        }

        Release release = new Release();

        release.setId(generateReleaseId());

        release.setProjectId(projectId);

        release.setVersion(
                request.getVersion()
        );

        release.setName(
                request.getName()
        );

        release.setNotes(
                request.getNotes()
        );

        release.setDeploymentId(
                request.getDeploymentId()
        );

        release.setMilestoneId(
                request.getMilestoneId()
        );

        release.setStatus(
                Release.Status.DRAFT
        );

        return releaseRepository.save(release);
    }

    public Release getRelease(
            String releaseId
    ) {

        return releaseRepository.findById(releaseId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Release not found: "
                                        + releaseId
                        ));
    }

    public Release updateRelease(
            String releaseId,
            UpdateReleaseRequest request
    ) {

        Release release =
                getRelease(releaseId);

        if (release.getStatus() ==
                Release.Status.RELEASED) {

            throw new BadRequestException(
                    "Published releases cannot be edited"
            );
        }

        if (request == null) {
            throw new BadRequestException(
                    "Release update data is required"
            );
        }

        if (request.getName() != null) {
            release.setName(
                    request.getName()
            );
        }

        if (request.getNotes() != null) {
            release.setNotes(
                    request.getNotes()
            );
        }

        if (request.getDeploymentId() != null) {
            release.setDeploymentId(
                    request.getDeploymentId()
            );
        }

        if (request.getMilestoneId() != null) {
            release.setMilestoneId(
                    request.getMilestoneId()
            );
        }

        return releaseRepository.save(release);
    }

    public Release publishRelease(
            String releaseId,
            String releasedBy
    ) {

        Release release =
                getRelease(releaseId);

        if (release.getStatus() ==
                Release.Status.RELEASED) {

            throw new BadRequestException(
                    "Release is already published"
            );
        }

        release.setStatus(
                Release.Status.RELEASED
        );

        release.setReleasedAt(
                LocalDateTime.now()
        );

        release.setReleasedBy(
                releasedBy != null &&
                        !releasedBy.isBlank()
                        ? releasedBy
                        : "system"
        );

        return releaseRepository.save(release);
    }

    public ChangelogResponse getChangelog(
            String releaseId
    ) {

        Release release =
                getRelease(releaseId);

        return new ChangelogResponse(
                release.getId(),
                release.getVersion(),
                release.getName(),
                release.getNotes(),
                release.getDeploymentId(),
                release.getMilestoneId(),
                release.getStatus().name()
        );
    }

    private String generateReleaseId() {

        return "REL-" +
                UUID.randomUUID()
                        .toString()
                        .substring(0, 4)
                        .toUpperCase();
    }
}
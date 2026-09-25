package com.neuroforge.cicd.service;

import com.neuroforge.cicd.dto.DeployRequest;
import com.neuroforge.cicd.dto.DeploymentHealthRequest;
import com.neuroforge.cicd.exception.BadRequestException;
import com.neuroforge.cicd.exception.ResourceNotFoundException;
import com.neuroforge.cicd.model.Build;
import com.neuroforge.cicd.model.Deployment;
import com.neuroforge.cicd.model.Pipeline;
import com.neuroforge.cicd.repository.BuildRepository;
import com.neuroforge.cicd.repository.DeploymentRepository;
import com.neuroforge.cicd.repository.PipelineRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final BuildRepository buildRepository;
    private final PipelineRepository pipelineRepository;

    public DeploymentService(
            DeploymentRepository deploymentRepository,
            BuildRepository buildRepository,
            PipelineRepository pipelineRepository
    ) {
        this.deploymentRepository = deploymentRepository;
        this.buildRepository = buildRepository;
        this.pipelineRepository = pipelineRepository;
    }

    public Deployment deploy(String buildId, DeployRequest request) {

        if (request == null || request.getEnvironment() == null) {
            throw new BadRequestException("Deployment environment is required");
        }

        Build build = buildRepository.findById(buildId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Build not found: " + buildId
                        ));

        if (build.getStatus() != Build.Status.SUCCESS) {
            throw new BadRequestException(
                    "Only successful builds can be deployed"
            );
        }

        Pipeline pipeline = pipelineRepository.findById(build.getPipelineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Pipeline not found: " + build.getPipelineId()
                        ));

        Deployment.Environment environment = request.getEnvironment();

        Deployment previousDeployment =
                deploymentRepository
                        .findTopByProjectIdAndEnvironmentAndStatusOrderByFinishedAtDesc(
                                build.getProjectId(),
                                environment,
                                Deployment.Status.DEPLOYED
                        )
                        .orElse(null);

        LocalDateTime start = LocalDateTime.now();

        Deployment deployment = new Deployment();

        deployment.setId(generateDeploymentId());

        deployment.setBuildId(build.getId());
        deployment.setPipelineId(build.getPipelineId());
        deployment.setProjectId(build.getProjectId());

        deployment.setEnvironment(environment);

        String version = "1.0." + build.getBuildNumber();
        String imageTag = pipeline.getName() + ":" + build.getBuildNumber();

        deployment.setVersion(version);
        deployment.setImageTag(imageTag);

        deployment.setStatus(Deployment.Status.IN_PROGRESS);

        deployment.setDeployedBy(
                build.getTriggeredBy() != null
                        ? build.getTriggeredBy()
                        : "system"
        );

        deployment.setStartedAt(start);

        deployment.setReplicasDesired(
                environment == Deployment.Environment.PROD ? 3 : 1
        );

        deployment.setReplicasReady(0);

        deployment.setCpuPercent(0.0);
        deployment.setMemoryPercent(0.0);

        if (previousDeployment != null) {
            deployment.setPreviousDeploymentId(
                    previousDeployment.getId()
            );
        }

        // Demo deployment completes immediately.
        deployment.setStatus(Deployment.Status.DEPLOYED);

        deployment.setReplicasReady(
                deployment.getReplicasDesired()
        );

        deployment.setCpuPercent(
                environment == Deployment.Environment.PROD
                        ? 23.0
                        : 15.0
        );

        deployment.setMemoryPercent(
                environment == Deployment.Environment.PROD
                        ? 47.0
                        : 35.0
        );

        LocalDateTime finish = LocalDateTime.now();

        deployment.setFinishedAt(finish);

        deployment.setDurationSeconds(
                Duration.between(start, finish).getSeconds()
        );

        return deploymentRepository.save(deployment);
    }

    public List<Deployment> getProjectDeployments(
            String projectId,
            String environment
    ) {

        if (environment == null || environment.isBlank()) {
            return deploymentRepository
                    .findByProjectIdOrderByStartedAtDesc(projectId);
        }

        Deployment.Environment env = parseEnvironment(environment);

        return deploymentRepository
                .findByProjectIdAndEnvironmentOrderByStartedAtDesc(
                        projectId,
                        env
                );
    }

    public Deployment getDeployment(String id) {

        return deploymentRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Deployment not found: " + id
                        ));
    }

    public Deployment getCurrentDeployment(
            String projectId,
            String environment
    ) {

        Deployment.Environment env = parseEnvironment(environment);

        return deploymentRepository
                .findTopByProjectIdAndEnvironmentAndStatusOrderByFinishedAtDesc(
                        projectId,
                        env,
                        Deployment.Status.DEPLOYED
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No current deployment found"
                        ));
    }

    public Deployment updateHealth(
            String deploymentId,
            DeploymentHealthRequest request
    ) {

        Deployment deployment = getDeployment(deploymentId);

        if (request == null) {
            throw new BadRequestException(
                    "Health update is required"
            );
        }

        if (request.getStatus() != null) {
            deployment.setStatus(request.getStatus());
        }

        if (request.getReplicasDesired() != null) {
            deployment.setReplicasDesired(
                    request.getReplicasDesired()
            );
        }

        if (request.getReplicasReady() != null) {
            deployment.setReplicasReady(
                    request.getReplicasReady()
            );
        }

        if (request.getCpuPercent() != null) {
            deployment.setCpuPercent(
                    request.getCpuPercent()
            );
        }

        if (request.getMemoryPercent() != null) {
            deployment.setMemoryPercent(
                    request.getMemoryPercent()
            );
        }

        if (deployment.getStartedAt() != null &&
                deployment.getFinishedAt() == null &&
                (deployment.getStatus() == Deployment.Status.DEPLOYED ||
                 deployment.getStatus() == Deployment.Status.FAILED)) {

            deployment.setFinishedAt(LocalDateTime.now());

            deployment.setDurationSeconds(
                    Duration.between(
                            deployment.getStartedAt(),
                            deployment.getFinishedAt()
                    ).getSeconds()
            );
        }

        return deploymentRepository.save(deployment);
    }

    private Deployment.Environment parseEnvironment(
            String environment
    ) {

        try {
            return Deployment.Environment.valueOf(
                    environment.toUpperCase()
            );
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Invalid environment. Use DEV, STAGING or PROD"
            );
        }
    }

    private String generateDeploymentId() {

        return "DEP-" +
                UUID.randomUUID()
                        .toString()
                        .substring(0, 4)
                        .toUpperCase();
    }

    public Deployment rollback(
        String deploymentId,
        String rollbackReason
) {

    if (rollbackReason == null || rollbackReason.isBlank()) {
        throw new BadRequestException(
                "Rollback reason is required"
        );
    }

    Deployment currentDeployment = getDeployment(deploymentId);

    if (currentDeployment.getStatus() != Deployment.Status.DEPLOYED) {
        throw new BadRequestException(
                "Only a deployed deployment can be rolled back"
        );
    }

    String previousDeploymentId =
            currentDeployment.getPreviousDeploymentId();

    if (previousDeploymentId == null ||
            previousDeploymentId.isBlank()) {

        throw new BadRequestException(
                "No previous successful deployment available for rollback"
        );
    }

    Deployment previousDeployment =
            getDeployment(previousDeploymentId);

    if (previousDeployment.getStatus() != Deployment.Status.DEPLOYED) {
        throw new BadRequestException(
                "Previous deployment is not available for rollback"
        );
    }

    // Mark current deployment as rolled back
    currentDeployment.setStatus(
            Deployment.Status.ROLLED_BACK
    );

    currentDeployment.setRollbackReason(
            rollbackReason
    );

    deploymentRepository.save(currentDeployment);

    // Create a new deployment using previous version/image
    Deployment rollbackDeployment = new Deployment();

    rollbackDeployment.setId(generateDeploymentId());

    rollbackDeployment.setBuildId(
            previousDeployment.getBuildId()
    );

    rollbackDeployment.setPipelineId(
            currentDeployment.getPipelineId()
    );

    rollbackDeployment.setProjectId(
            currentDeployment.getProjectId()
    );

    rollbackDeployment.setEnvironment(
            currentDeployment.getEnvironment()
    );

    rollbackDeployment.setVersion(
            previousDeployment.getVersion()
    );

    rollbackDeployment.setImageTag(
            previousDeployment.getImageTag()
    );

    rollbackDeployment.setStatus(
            Deployment.Status.DEPLOYED
    );

    rollbackDeployment.setDeployedBy(
            currentDeployment.getDeployedBy()
    );

    rollbackDeployment.setStartedAt(
            LocalDateTime.now()
    );

    rollbackDeployment.setReplicasDesired(
            previousDeployment.getReplicasDesired()
    );

    rollbackDeployment.setReplicasReady(
            previousDeployment.getReplicasReady()
    );

    rollbackDeployment.setCpuPercent(
            previousDeployment.getCpuPercent()
    );

    rollbackDeployment.setMemoryPercent(
            previousDeployment.getMemoryPercent()
    );

    rollbackDeployment.setPreviousDeploymentId(
            previousDeployment.getId()
    );

    rollbackDeployment.setRollbackReason(
            rollbackReason
    );

    rollbackDeployment.setFinishedAt(
            LocalDateTime.now()
    );

    rollbackDeployment.setDurationSeconds(0L);

    return deploymentRepository.save(
            rollbackDeployment
    );
}

public List<Deployment> getRollbacks(String projectId) {

    return deploymentRepository
            .findByProjectIdAndStatusOrderByStartedAtDesc(
                    projectId,
                    Deployment.Status.ROLLED_BACK
            );
}
}
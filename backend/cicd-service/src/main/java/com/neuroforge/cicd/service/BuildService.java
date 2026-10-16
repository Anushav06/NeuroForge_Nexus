package com.neuroforge.cicd.service;

import com.neuroforge.cicd.dto.StageUpdateRequest;
import com.neuroforge.cicd.dto.TriggerBuildRequest;
import com.neuroforge.cicd.exception.BadRequestException;
import com.neuroforge.cicd.exception.ResourceNotFoundException;
import com.neuroforge.cicd.model.Build;
import com.neuroforge.cicd.model.BuildStage;
import com.neuroforge.cicd.model.Pipeline;
import com.neuroforge.cicd.model.TestResult;
import com.neuroforge.cicd.repository.BuildRepository;
import com.neuroforge.cicd.repository.PipelineRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class BuildService {

    private final BuildRepository buildRepository;
    private final PipelineRepository pipelineRepository;
    private final MongoTemplate mongoTemplate;

    public BuildService(
            BuildRepository buildRepository,
            PipelineRepository pipelineRepository,
            MongoTemplate mongoTemplate) {

        this.buildRepository = buildRepository;
        this.pipelineRepository = pipelineRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public Build triggerBuild(
            String pipelineId,
            TriggerBuildRequest request) {

        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Pipeline not found: " + pipelineId));

        if (!pipeline.isEnabled()) {
            throw new BadRequestException(
                    "Pipeline is disabled");
        }

        int nextBuildNumber =
                buildRepository
                        .findTopByPipelineIdOrderByBuildNumberDesc(pipelineId)
                        .map(build -> build.getBuildNumber() + 1)
                        .orElse(1);

        Build build = new Build();

        build.setId(generateBuildId());
        build.setPipelineId(pipeline.getId());
        build.setProjectId(pipeline.getProjectId());
        build.setBuildNumber(nextBuildNumber);

        build.setBranch(
                isBlank(request.getBranch())
                        ? pipeline.getDefaultBranch()
                        : request.getBranch());

        build.setCommitSha(
                isBlank(request.getCommitSha())
                        ? "local-manual"
                        : request.getCommitSha());

        build.setCommitMessage(
                isBlank(request.getCommitMessage())
                        ? "Manual build triggered"
                        : request.getCommitMessage());

        build.setTriggeredBy(
                isBlank(request.getTriggeredBy())
                        ? "system"
                        : request.getTriggeredBy());

        build.setTrigger(Build.Trigger.MANUAL);
        build.setStatus(Build.Status.QUEUED);

        List<BuildStage> stages = new ArrayList<>();

        for (String stageName : pipeline.getStages()) {

            BuildStage stage = new BuildStage();

            stage.setName(stageName);
            stage.setStatus(BuildStage.Status.QUEUED);
            stage.setLogs("Stage queued.");

            stages.add(stage);
        }

        build.setStages(stages);

        return buildRepository.save(build);
    }

    public Page<Build> getBuilds(
            String pipelineId,
            String status,
            String branch,
            int page,
            int size) {

        if (!pipelineRepository.existsById(pipelineId)) {
            throw new ResourceNotFoundException(
                    "Pipeline not found: " + pipelineId);
        }

        Criteria criteria =
                Criteria.where("pipelineId").is(pipelineId);

        if (!isBlank(status)) {

            Build.Status buildStatus;

            try {
                buildStatus =
                        Build.Status.valueOf(
                                status.toUpperCase());

            } catch (IllegalArgumentException ex) {

                throw new BadRequestException(
                        "Invalid build status: " + status);
            }

            criteria.and("status").is(buildStatus);
        }

        if (!isBlank(branch)) {
            criteria.and("branch").is(branch);
        }

        Query countQuery = new Query(criteria);

        long total =
                mongoTemplate.count(countQuery, Build.class);

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Direction.DESC,
                                "buildNumber"));

        Query dataQuery =
                new Query(criteria).with(pageable);

        List<Build> builds =
                mongoTemplate.find(
                        dataQuery,
                        Build.class);

        return new PageImpl<>(
                builds,
                pageable,
                total);
    }

    public Build getBuild(String buildId) {

        return buildRepository.findById(buildId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Build not found: " + buildId));
    }

    public String getLogs(
            String buildId,
            String stageName) {

        Build build = getBuild(buildId);

        if (isBlank(stageName)) {
            throw new BadRequestException(
                    "stage parameter is required");
        }

        for (BuildStage stage : build.getStages()) {

            if (stage.getName()
                    .equalsIgnoreCase(stageName)) {

                return stage.getLogs();
            }
        }

        throw new ResourceNotFoundException(
                "Stage not found: " + stageName);
    }

    public Build cancelBuild(String buildId) {

        Build build = getBuild(buildId);

        if (build.getStatus() != Build.Status.QUEUED
                && build.getStatus() != Build.Status.RUNNING) {

            throw new BadRequestException(
                    "Only queued or running builds can be cancelled");
        }

        build.setStatus(Build.Status.CANCELLED);
        build.setFinishedAt(LocalDateTime.now());

        calculateDuration(build);

        return buildRepository.save(build);
    }

    public Build retryBuild(String buildId) {

        Build oldBuild = getBuild(buildId);

        if (oldBuild.getStatus() != Build.Status.FAILED
                && oldBuild.getStatus() != Build.Status.CANCELLED) {

            throw new BadRequestException(
                    "Only failed or cancelled builds can be retried");
        }

        Pipeline pipeline =
                pipelineRepository.findById(
                        oldBuild.getPipelineId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Pipeline not found"));

        int nextBuildNumber =
                buildRepository
                        .findTopByPipelineIdOrderByBuildNumberDesc(
                                oldBuild.getPipelineId())
                        .map(build -> build.getBuildNumber() + 1)
                        .orElse(1);

        Build retry = new Build();

        retry.setId(generateBuildId());
        retry.setPipelineId(oldBuild.getPipelineId());
        retry.setProjectId(oldBuild.getProjectId());
        retry.setBuildNumber(nextBuildNumber);

        retry.setBranch(oldBuild.getBranch());
        retry.setCommitSha(oldBuild.getCommitSha());
        retry.setCommitMessage(
                "Retry of build #" + oldBuild.getBuildNumber());

        retry.setTriggeredBy(oldBuild.getTriggeredBy());
        retry.setTrigger(Build.Trigger.MANUAL);
        retry.setStatus(Build.Status.QUEUED);

        List<BuildStage> stages = new ArrayList<>();

        for (String stageName : pipeline.getStages()) {

            BuildStage stage = new BuildStage();

            stage.setName(stageName);
            stage.setStatus(BuildStage.Status.QUEUED);
            stage.setLogs("Stage queued for retry.");

            stages.add(stage);
        }

        retry.setStages(stages);

        return buildRepository.save(retry);
    }

    public Build updateStage(
            String buildId,
            String stageName,
            StageUpdateRequest request) {

        Build build = getBuild(buildId);

        if (request.getStatus() == null) {
            throw new BadRequestException(
                    "Stage status is required");
        }

        BuildStage targetStage = null;

        for (BuildStage stage : build.getStages()) {

            if (stage.getName()
                    .equalsIgnoreCase(stageName)) {

                targetStage = stage;
                break;
            }
        }

        if (targetStage == null) {
            throw new ResourceNotFoundException(
                    "Stage not found: " + stageName);
        }

        BuildStage.Status oldStatus =
                targetStage.getStatus();

        BuildStage.Status newStatus =
                request.getStatus();

        validateStageTransition(
                oldStatus,
                newStatus);

        LocalDateTime now = LocalDateTime.now();

        if (newStatus == BuildStage.Status.RUNNING
                && targetStage.getStartedAt() == null) {

            targetStage.setStartedAt(now);

            if (build.getStartedAt() == null) {
                build.setStartedAt(now);
            }

            build.setStatus(Build.Status.RUNNING);
        }

        if (request.getLogs() != null) {
            targetStage.setLogs(request.getLogs());
        }

        targetStage.setStatus(newStatus);

        if (newStatus == BuildStage.Status.SUCCESS
                || newStatus == BuildStage.Status.FAILED
                || newStatus == BuildStage.Status.CANCELLED) {

            if (targetStage.getStartedAt() == null) {
                targetStage.setStartedAt(now);
            }

            targetStage.setFinishedAt(now);

            targetStage.setDurationSeconds(
                    Duration.between(
                            targetStage.getStartedAt(),
                            now).getSeconds());
        }

        updateOverallBuildStatus(build);

        return buildRepository.save(build);
    }

    private void updateOverallBuildStatus(Build build) {

        boolean allSuccess = true;
        boolean hasRunning = false;
        boolean hasFailed = false;
        boolean hasCancelled = false;

        for (BuildStage stage : build.getStages()) {

            if (stage.getStatus()
                    != BuildStage.Status.SUCCESS) {

                allSuccess = false;
            }

            if (stage.getStatus()
                    == BuildStage.Status.RUNNING) {

                hasRunning = true;
            }

            if (stage.getStatus()
                    == BuildStage.Status.FAILED) {

                hasFailed = true;
            }

            if (stage.getStatus()
                    == BuildStage.Status.CANCELLED) {

                hasCancelled = true;
            }
        }

        if (hasFailed) {

            build.setStatus(Build.Status.FAILED);
            finishBuild(build);

        } else if (hasCancelled) {

            build.setStatus(Build.Status.CANCELLED);
            finishBuild(build);

        } else if (allSuccess && !build.getStages().isEmpty()) {

            build.setStatus(Build.Status.SUCCESS);
            finishBuild(build);

        } else if (hasRunning) {

            build.setStatus(Build.Status.RUNNING);
        }
    }

    private void finishBuild(Build build) {

        LocalDateTime now = LocalDateTime.now();

        if (build.getStartedAt() == null) {
            build.setStartedAt(now);
        }

        build.setFinishedAt(now);

        calculateDuration(build);
    }

    private void calculateDuration(Build build) {

        if (build.getStartedAt() != null
                && build.getFinishedAt() != null) {

            build.setDurationSeconds(
                    Duration.between(
                            build.getStartedAt(),
                            build.getFinishedAt())
                            .getSeconds());
        }
    }

    private void validateStageTransition(
            BuildStage.Status oldStatus,
            BuildStage.Status newStatus) {

        if (oldStatus == newStatus) {
            return;
        }

        if (oldStatus == BuildStage.Status.QUEUED) {

            if (newStatus == BuildStage.Status.RUNNING
                    || newStatus == BuildStage.Status.CANCELLED) {
                return;
            }
        }

        if (oldStatus == BuildStage.Status.RUNNING) {

            if (newStatus == BuildStage.Status.SUCCESS
                    || newStatus == BuildStage.Status.FAILED
                    || newStatus == BuildStage.Status.CANCELLED) {
                return;
            }
        }

        throw new BadRequestException(
                "Invalid stage transition from "
                        + oldStatus
                        + " to "
                        + newStatus);
    }

    private String generateBuildId() {

        String characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        StringBuilder value =
                new StringBuilder("BLD-");

        for (int i = 0; i < 4; i++) {

            int index =
                    (int) (Math.random()
                            * characters.length());

            value.append(
                    characters.charAt(index));
        }

        return value.toString();
    }

    private boolean isBlank(String value) {

        return value == null
                || value.trim().isEmpty();
    }

    public Build saveTestResult(
        String buildId,
        TestResult testResult) {

    Build build = getBuild(buildId);

    if (testResult == null) {
        throw new BadRequestException(
                "Test result is required");
    }

    build.setTestResult(testResult);

    return buildRepository.save(build);
}

public TestResult getTestResult(String buildId) {

    Build build = getBuild(buildId);

    if (build.getTestResult() == null) {
        throw new ResourceNotFoundException(
                "Test results not found for build: " + buildId);
    }

    return build.getTestResult();
}
}
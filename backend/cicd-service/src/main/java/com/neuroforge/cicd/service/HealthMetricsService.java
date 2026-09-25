package com.neuroforge.cicd.service;

import com.neuroforge.cicd.dto.CicdStatsResponse;
import com.neuroforge.cicd.dto.CoverageTrendResponse;
import com.neuroforge.cicd.dto.PipelineHealthResponse;
import com.neuroforge.cicd.dto.PipelineMetricResponse;
import com.neuroforge.cicd.exception.ResourceNotFoundException;
import com.neuroforge.cicd.model.Build;
import com.neuroforge.cicd.model.Deployment;
import com.neuroforge.cicd.model.Pipeline;
import com.neuroforge.cicd.repository.BuildRepository;
import com.neuroforge.cicd.repository.DeploymentRepository;
import com.neuroforge.cicd.repository.PipelineRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Comparator;

@Service
public class HealthMetricsService {

    private final PipelineRepository pipelineRepository;
    private final BuildRepository buildRepository;
    private final DeploymentRepository deploymentRepository;

    public HealthMetricsService(
            PipelineRepository pipelineRepository,
            BuildRepository buildRepository,
            DeploymentRepository deploymentRepository
    ) {
        this.pipelineRepository = pipelineRepository;
        this.buildRepository = buildRepository;
        this.deploymentRepository = deploymentRepository;
    }

    public PipelineHealthResponse getPipelineHealth(
            String pipelineId
    ) {

        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Pipeline not found: " + pipelineId
                        ));

        List<Build> builds =
                buildRepository
                        .findByPipelineIdOrderByBuildNumberDesc(
                                pipelineId
                        );

        String healthStatus = "HEALTHY";
        String latestBuildStatus = "N/A";
        Integer buildNumber = null;
        String lastUpdated = null;

        if (!builds.isEmpty()) {

            Build latestBuild = builds.get(0);

            latestBuildStatus =
                    latestBuild.getStatus().name();

            buildNumber =
                    latestBuild.getBuildNumber();

            if (latestBuild.getStartedAt() != null) {
                lastUpdated =
                        latestBuild.getStartedAt().toString();
            }

            if (latestBuild.getStatus() == Build.Status.FAILED) {
                healthStatus = "FAILING";

            } else if (
                    latestBuild.getStatus() == Build.Status.RUNNING ||
                    latestBuild.getStatus() == Build.Status.QUEUED
            ) {
                healthStatus = "DEGRADED";

            } else if (
                    latestBuild.getStatus() == Build.Status.CANCELLED
            ) {
                healthStatus = "DEGRADED";
            }
        }

        pipeline.setHealthStatus(
                Pipeline.HealthStatus.valueOf(healthStatus)
        );

        pipelineRepository.save(pipeline);

        return new PipelineHealthResponse(
                pipeline.getId(),
                pipeline.getName(),
                healthStatus,
                latestBuildStatus,
                buildNumber,
                lastUpdated
        );
    }

    public CicdStatsResponse getProjectStats(
            String projectId
    ) {

        List<Pipeline> pipelines =
                pipelineRepository.findByProjectId(
                        projectId
                );

        List<Build> allBuilds = new ArrayList<>();

        for (Pipeline pipeline : pipelines) {

            allBuilds.addAll(
                    buildRepository
                            .findByPipelineIdOrderByBuildNumberDesc(
                                    pipeline.getId()
                            )
            );
        }

        LocalDateTime since =
                LocalDateTime.now().minusDays(1);

        long buildsPerDay =
                allBuilds.stream()
                        .filter(build ->
                                build.getStartedAt() != null &&
                                build.getStartedAt()
                                        .isAfter(since)
                        )
                        .count();

        long completedBuilds =
                allBuilds.stream()
                        .filter(build ->
                                build.getStatus() == Build.Status.SUCCESS ||
                                build.getStatus() == Build.Status.FAILED
                        )
                        .count();

        long successfulBuilds =
                allBuilds.stream()
                        .filter(build ->
                                build.getStatus() == Build.Status.SUCCESS
                        )
                        .count();

        double successRate = 0.0;

        if (completedBuilds > 0) {
            successRate =
                    (successfulBuilds * 100.0)
                            / completedBuilds;
        }

        List<Deployment> deployments =
                deploymentRepository
                        .findByProjectIdOrderByStartedAtDesc(
                                projectId
                        );

        double avgDeployMinutes = 0.0;

        List<Deployment> completedDeployments =
                deployments.stream()
                        .filter(deployment ->
                                deployment.getDurationSeconds() != null
                        )
                        .toList();

        if (!completedDeployments.isEmpty()) {

            double averageSeconds =
                    completedDeployments.stream()
                            .mapToLong(
                                    Deployment::getDurationSeconds
                            )
                            .average()
                            .orElse(0.0);

            avgDeployMinutes =
                    averageSeconds / 60.0;
        }

        return new CicdStatsResponse(
                buildsPerDay,
                Math.round(successRate * 10.0) / 10.0,
                Math.round(avgDeployMinutes * 10.0) / 10.0,
                "↓67%"
        );
    }

    public List<PipelineMetricResponse> getPipelineMetrics(
            String pipelineId,
            int days
    ) {

        if (days <= 0) {
            days = 14;
        }

        Pipeline pipeline =
                pipelineRepository.findById(pipelineId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Pipeline not found: "
                                                + pipelineId
                                ));

        List<Build> builds =
                buildRepository
                        .findByPipelineIdOrderByBuildNumberDesc(
                                pipeline.getId()
                        );

        List<PipelineMetricResponse> metrics =
                new ArrayList<>();

        LocalDate today = LocalDate.now();

        for (int i = days - 1; i >= 0; i--) {

            LocalDate date =
                    today.minusDays(i);

            long total = 0;
            long successful = 0;
            long totalDuration = 0;
            long durationCount = 0;

            for (Build build : builds) {

                if (build.getStartedAt() == null) {
                    continue;
                }

                if (!build.getStartedAt()
                        .toLocalDate()
                        .equals(date)) {
                    continue;
                }

                total++;

                if (build.getStatus() ==
                        Build.Status.SUCCESS) {

                    successful++;
                }

                if (build.getDurationSeconds() != null) {

                    totalDuration +=
                            build.getDurationSeconds();

                    durationCount++;
                }
            }

            double successRate = 0.0;

            if (total > 0) {
                successRate =
                        (successful * 100.0) / total;
            }

            double avgDurationMinutes = 0.0;

            if (durationCount > 0) {
                avgDurationMinutes =
                        (totalDuration / (double) durationCount)
                                / 60.0;
            }

            metrics.add(
                    new PipelineMetricResponse(
                            date.toString(),
                            total,
                            successful,
                            Math.round(
                                    successRate * 10.0
                            ) / 10.0,
                            Math.round(
                                    avgDurationMinutes * 10.0
                            ) / 10.0
                    )
            );
        }

        return metrics;
    }

    /**
     * Refresh pipeline health every 5 minutes.
     */
    @Scheduled(fixedRate = 300000)
    public void refreshPipelineHealth() {

        List<Pipeline> pipelines =
                pipelineRepository.findAll();

        for (Pipeline pipeline : pipelines) {

            List<Build> builds =
                    buildRepository
                            .findByPipelineIdOrderByBuildNumberDesc(
                                    pipeline.getId()
                            );

            if (builds.isEmpty()) {
                continue;
            }

            Build latestBuild = builds.get(0);

            if (latestBuild.getStatus() ==
                    Build.Status.SUCCESS) {

                pipeline.setHealthStatus(
                        Pipeline.HealthStatus.HEALTHY
                );

            } else if (
                    latestBuild.getStatus() ==
                            Build.Status.FAILED
            ) {

                pipeline.setHealthStatus(
                        Pipeline.HealthStatus.FAILING
                );

            } else {

                pipeline.setHealthStatus(
                        Pipeline.HealthStatus.DEGRADED
                );
            }

            pipelineRepository.save(pipeline);
        }
    }

    public List<CoverageTrendResponse> getCoverageTrend(String pipelineId, int last) {

    if (last <= 0) {
        last = 20;
    }

    List<Build> builds =
            buildRepository.findByPipelineIdOrderByBuildNumberDesc(pipelineId);

    return builds.stream()
            .filter(build -> build.getTestResult() != null)
            .limit(last)
            .sorted(Comparator.comparing(Build::getBuildNumber))
            .map(build -> new CoverageTrendResponse(
                    build.getFinishedAt() != null
                            ? build.getFinishedAt().toLocalDate().toString()
                            : "",
                    build.getBuildNumber(),
                    build.getTestResult().getCoveragePercent()
            ))
            .toList();
}
}
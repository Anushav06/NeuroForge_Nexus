package com.neuroforge.cicd.config;

import com.neuroforge.cicd.model.Build;
import com.neuroforge.cicd.model.BuildStage;
import com.neuroforge.cicd.model.Deployment;
import com.neuroforge.cicd.model.Pipeline;
import com.neuroforge.cicd.model.Release;
import com.neuroforge.cicd.model.SonarResult;
import com.neuroforge.cicd.model.TestResult;
import com.neuroforge.cicd.repository.BuildRepository;
import com.neuroforge.cicd.repository.DeploymentRepository;
import com.neuroforge.cicd.repository.PipelineRepository;
import com.neuroforge.cicd.repository.ReleaseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final String PROJECT_ID = "PRJ-1036";

    private final PipelineRepository pipelineRepository;
    private final BuildRepository buildRepository;
    private final DeploymentRepository deploymentRepository;
    private final ReleaseRepository releaseRepository;

    public DataSeeder(
            PipelineRepository pipelineRepository,
            BuildRepository buildRepository,
            DeploymentRepository deploymentRepository,
            ReleaseRepository releaseRepository
    ) {
        this.pipelineRepository = pipelineRepository;
        this.buildRepository = buildRepository;
        this.deploymentRepository = deploymentRepository;
        this.releaseRepository = releaseRepository;
    }

    @Override
    public void run(String... args) {

        Pipeline paymentPipeline = seedPaymentPipeline();

        seedAdditionalPipelines();

        seedHistoricalBuilds(paymentPipeline);

        Build latestBuild =
                buildRepository
                        .findByPipelineIdAndBuildNumber(
                                paymentPipeline.getId(),
                                1247
                        )
                        .orElse(null);

        if (latestBuild != null) {
            seedDeployments(latestBuild, paymentPipeline);
            seedReleases();
        }

        System.out.println("======================================");
        System.out.println("NeuroForge Nexus M3 demo data seeded.");
        System.out.println("======================================");
    }

    // =========================================================
    // PIPELINES
    // =========================================================

    private Pipeline seedPaymentPipeline() {

        Pipeline pipeline =
                pipelineRepository
                        .findFirstByName("payment-service")
                        .orElse(null);

        if (pipeline == null) {

            pipeline = new Pipeline();

            pipeline.setId("PIPE-PAY1");
            pipeline.setProjectId(PROJECT_ID);
            pipeline.setName("payment-service");
            pipeline.setRepoUrl(
                    "https://github.com/Anushav06/payment-service"
            );
            pipeline.setDefaultBranch("main");
            pipeline.setProvider(
                    Pipeline.Provider.GITHUB_ACTIONS
            );
            pipeline.setStages(
                    new ArrayList<>(
                            List.of(
                                    "Build",
                                    "Test",
                                    "Sonar",
                                    "Docker",
                                    "Deploy"
                            )
                    )
            );
            pipeline.setTriggerType(
                    Pipeline.TriggerType.PUSH
            );
            pipeline.setEnabled(true);
            pipeline.setHealthStatus(
                    Pipeline.HealthStatus.HEALTHY
            );
            pipeline.setCreatedAt(
                    LocalDateTime.now().minusDays(30)
            );

            pipeline =
                    pipelineRepository.save(pipeline);
        }

        return pipeline;
    }

    private void seedAdditionalPipelines() {

        createPipelineIfMissing(
                "PIPE-FIN1",
                "fincore-api"
        );

        createPipelineIfMissing(
                "PIPE-NOT1",
                "notification-service"
        );
    }

    private void createPipelineIfMissing(
            String id,
            String name
    ) {

        if (pipelineRepository
                .findFirstByName(name)
                .isPresent()) {
            return;
        }

        Pipeline pipeline = new Pipeline();

        pipeline.setId(id);
        pipeline.setProjectId(PROJECT_ID);
        pipeline.setName(name);
        pipeline.setRepoUrl(
                "https://github.com/Anushav06/" + name
        );
        pipeline.setDefaultBranch("main");
        pipeline.setProvider(
                Pipeline.Provider.GITHUB_ACTIONS
        );

        pipeline.setStages(
                new ArrayList<>(
                        List.of(
                                "Build",
                                "Test",
                                "Sonar",
                                "Docker",
                                "Deploy"
                        )
                )
        );

        pipeline.setTriggerType(
                Pipeline.TriggerType.PUSH
        );

        pipeline.setEnabled(true);

        pipeline.setHealthStatus(
                Pipeline.HealthStatus.HEALTHY
        );

        pipeline.setCreatedAt(
                LocalDateTime.now().minusDays(30)
        );

        pipelineRepository.save(pipeline);
    }

    // =========================================================
    // BUILDS
    // =========================================================

    private void seedHistoricalBuilds(
            Pipeline pipeline
    ) {

        LocalDateTime now = LocalDateTime.now();

        /*
         * 116 builds:
         *
         * 113 SUCCESS
         * 3 FAILED
         *
         * 113 / 116 = 97.4138%
         * Rounded = 97.4%
         *
         * Build numbers:
         * 1132 ... 1247
         */

        for (int buildNumber = 1132;
             buildNumber <= 1247;
             buildNumber++) {

            if (buildRepository
                    .findByPipelineIdAndBuildNumber(
                            pipeline.getId(),
                            buildNumber
                    )
                    .isPresent()) {
                continue;
            }

            Build build = new Build();

            build.setId(
                    "BLD-" + String.format(
                            "%04d",
                            buildNumber
                    )
            );

            build.setPipelineId(
                    pipeline.getId()
            );

            build.setProjectId(
                    PROJECT_ID
            );

            build.setBuildNumber(
                    buildNumber
            );

            build.setBranch("main");

            if (buildNumber == 1247) {

                build.setCommitSha("a3f2c1d");

                build.setCommitMessage(
                        "Add payment service pipeline"
                );

                build.setTriggeredBy("Anusha");

            } else {

                build.setCommitSha(
                        generateCommitSha(buildNumber)
                );

                build.setCommitMessage(
                        "Automated build #" + buildNumber
                );

                build.setTriggeredBy("GitHub Actions");
            }

            build.setTrigger(
                    Build.Trigger.PUSH
            );

            boolean failed =
                    buildNumber == 1160 ||
                    buildNumber == 1200 ||
                    buildNumber == 1230;

            if (failed) {

                build.setStatus(
                        Build.Status.FAILED
                );

            } else {

                build.setStatus(
                        Build.Status.SUCCESS
                );
            }

            LocalDateTime startedAt;

            if (buildNumber == 1247) {

                startedAt =
                        now.minusMinutes(5);

            } else {

                int index =
                        buildNumber - 1132;

                long totalMinutes =
                        (14L * 24L * 60L) - 20L;

                long interval =
                        totalMinutes / 115L;

                startedAt =
                        now.minusDays(14)
                                .plusMinutes(
                                        index * interval
                                );
            }

            build.setStartedAt(startedAt);

            LocalDateTime finishedAt =
                    startedAt.plusSeconds(252);

            build.setFinishedAt(finishedAt);

            build.setDurationSeconds(252L);

            build.setStages(
                    createStages(
                            startedAt,
                            failed
                    )
            );

            if (buildNumber == 1247) {

                build.setTestResult(
                        createTestResult()
                );

                build.setArtifactUrl(
                        "https://example.com/artifacts/payment-service-1247.jar"
                );

                build.setImageTag(
                        "payment-service:1247"
                );
            }

            buildRepository.save(build);
        }
    }

    private List<BuildStage> createStages(
            LocalDateTime startedAt,
            boolean failed
    ) {

        List<BuildStage> stages =
                new ArrayList<>();

        String[] stageNames = {
                "Build",
                "Test",
                "Sonar",
                "Docker",
                "Deploy"
        };

        long[] durations = {
                45,
                50,
                40,
                45,
                72
        };

        LocalDateTime current =
                startedAt;

        for (int i = 0;
             i < stageNames.length;
             i++) {

            BuildStage stage =
                    new BuildStage();

            stage.setName(
                    stageNames[i]
            );

            stage.setStartedAt(current);

            stage.setDurationSeconds(
                    durations[i]
            );

            stage.setFinishedAt(
                    current.plusSeconds(
                            durations[i]
                    )
            );

            if (failed && i == 1) {

                stage.setStatus(
                        BuildStage.Status.FAILED
                );

                stage.setLogs(
                        "Tests failed."
                );

            } else {

                stage.setStatus(
                        BuildStage.Status.SUCCESS
                );

                stage.setLogs(
                        stageNames[i] +
                                " completed successfully."
                );
            }

            stages.add(stage);

            current =
                    current.plusSeconds(
                            durations[i]
                    );
        }

        return stages;
    }

    private TestResult createTestResult() {

        TestResult result =
                new TestResult();

        result.setPassed(247);
        result.setFailed(0);
        result.setSkipped(0);
        result.setTotal(247);

        result.setCoveragePercent(87.0);

        result.setDurationSeconds(75L);

        result.setFailures(
                new ArrayList<>()
        );

        SonarResult sonar =
                new SonarResult();

        sonar.setQualityGate(
                SonarResult.QualityGate.PASSED
        );

        sonar.setBugs(0);
        sonar.setVulnerabilities(0);
        sonar.setCodeSmells(0);

        sonar.setDuplicationPercent(2.1);

        result.setSonar(sonar);

        return result;
    }

    private String generateCommitSha(
            int buildNumber
    ) {

        return String.format(
                "%07x",
                buildNumber * 7919
        ).substring(0, 7);
    }

    // =========================================================
    // DEPLOYMENTS
    // =========================================================

    private void seedDeployments(
            Build latestBuild,
            Pipeline pipeline
    ) {

        if (deploymentRepository
                .findByProjectIdOrderByStartedAtDesc(
                        PROJECT_ID
                )
                .size() > 0) {

            return;
        }

        LocalDateTime now =
                LocalDateTime.now();

        // Previous successful PROD deployment
        Deployment previous =
                new Deployment();

        previous.setId("DEP-PROD1");
        previous.setBuildId(
                latestBuild.getId()
        );
        previous.setPipelineId(
                pipeline.getId()
        );
        previous.setProjectId(
                PROJECT_ID
        );
        previous.setEnvironment(
                Deployment.Environment.PROD
        );
        previous.setVersion("2.2.0");
        previous.setImageTag(
                "payment-service:1245"
        );
        previous.setStatus(
                Deployment.Status.DEPLOYED
        );
        previous.setDeployedBy("Anusha");

        previous.setStartedAt(
                now.minusHours(5)
        );

        previous.setFinishedAt(
                now.minusHours(5)
                        .plusSeconds(252)
        );

        previous.setDurationSeconds(252L);

        previous.setReplicasDesired(3);
        previous.setReplicasReady(3);

        previous.setCpuPercent(21.0);
        previous.setMemoryPercent(44.0);

        deploymentRepository.save(previous);

        // Deployment that was rolled back
        Deployment rolledBack =
                new Deployment();

        rolledBack.setId("DEP-PROD2");
        rolledBack.setBuildId(
                latestBuild.getId()
        );
        rolledBack.setPipelineId(
                pipeline.getId()
        );
        rolledBack.setProjectId(
                PROJECT_ID
        );
        rolledBack.setEnvironment(
                Deployment.Environment.PROD
        );
        rolledBack.setVersion("2.3.0");
        rolledBack.setImageTag(
                "payment-service:1247"
        );
        rolledBack.setStatus(
                Deployment.Status.ROLLED_BACK
        );
        rolledBack.setDeployedBy("Anusha");

        rolledBack.setStartedAt(
                now.minusHours(2)
        );

        rolledBack.setFinishedAt(
        now.minusHours(2)
                .plusSeconds(252)
);

        rolledBack.setDurationSeconds(252L);

        rolledBack.setReplicasDesired(3);
        rolledBack.setReplicasReady(2);

        rolledBack.setCpuPercent(72.0);
        rolledBack.setMemoryPercent(81.0);

        rolledBack.setPreviousDeploymentId(
                previous.getId()
        );

        rolledBack.setRollbackReason(
                "Production health degradation"
        );

        deploymentRepository.save(
                rolledBack
        );

        // Current deployment after rollback
        Deployment current =
                new Deployment();

        current.setId("DEP-PROD3");

        current.setBuildId(
                previous.getBuildId()
        );

        current.setPipelineId(
                pipeline.getId()
        );

        current.setProjectId(
                PROJECT_ID
        );

        current.setEnvironment(
                Deployment.Environment.PROD
        );

        current.setVersion("2.2.0");

        current.setImageTag(
                "payment-service:1245"
        );

        current.setStatus(
                Deployment.Status.DEPLOYED
        );

        current.setDeployedBy("Anusha");

        current.setStartedAt(
                now.minusMinutes(10)
        );

        current.setFinishedAt(
                now.minusMinutes(6)
        );

        current.setDurationSeconds(252L);

        current.setReplicasDesired(3);
        current.setReplicasReady(3);

        current.setCpuPercent(23.0);
        current.setMemoryPercent(47.0);

        current.setPreviousDeploymentId(
                previous.getId()
        );

        current.setRollbackReason(
                "Restored previous stable version"
        );

        deploymentRepository.save(current);
    }

    // =========================================================
    // RELEASES
    // =========================================================

    private void seedReleases() {

        createReleaseIfMissing(
                "REL-2100",
                "2.1.0",
                "Payment Service 2.1",
                "Initial payment service release",
                "RELEASED",
                "DEP-PROD1"
        );

        createReleaseIfMissing(
                "REL-2200",
                "2.2.0",
                "Payment Service 2.2",
                "Performance and stability improvements",
                "RELEASED",
                "DEP-PROD1"
        );

        createReleaseIfMissing(
                "REL-2300",
                "2.3.0",
                "Payment Service 2.3",
                "New CI/CD pipeline release",
                "ROLLED_BACK",
                "DEP-PROD2"
        );
    }

    private void createReleaseIfMissing(
            String id,
            String version,
            String name,
            String notes,
            String status,
            String deploymentId
    ) {

        if (releaseRepository
                .existsByProjectIdAndVersion(
                        PROJECT_ID,
                        version
                )) {

            return;
        }

        Release release =
                new Release();

        release.setId(id);
        release.setProjectId(
                PROJECT_ID
        );

        release.setVersion(version);
        release.setName(name);
        release.setNotes(notes);

        release.setDeploymentId(
                deploymentId
        );

        release.setMilestoneId(
                "MILESTONE-" + version
        );

        release.setStatus(
                Release.Status.valueOf(status)
        );

        if (!status.equals("DRAFT")) {

            release.setReleasedAt(
                    LocalDateTime.now()
                            .minusHours(1)
            );

            release.setReleasedBy(
                    "Anusha"
            );
        }

        releaseRepository.save(release);
    }
}
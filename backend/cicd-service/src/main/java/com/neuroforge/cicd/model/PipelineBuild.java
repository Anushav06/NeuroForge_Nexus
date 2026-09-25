package com.neuroforge.cicd.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.List;

@Document(collection = "pipeline_builds")
public class PipelineBuild {
    @Id
    private String id;
    private String projectId;
    private String branch;
    private String commitMessage;
    private String commitHash;
    private String status; // SUCCESS, FAILED, RUNNING, QUEUED
    private String triggeredBy;
    private Instant startedAt;
    private long durationSeconds;
    private List<Stage> stages;
    private boolean isActiveDeployment;

    public static class Stage {
        private String name;
        private String status; // PASSED, FAILED, PENDING, RUNNING

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    public String getCommitMessage() { return commitMessage; }
    public void setCommitMessage(String commitMessage) { this.commitMessage = commitMessage; }
    public String getCommitHash() { return commitHash; }
    public void setCommitHash(String commitHash) { this.commitHash = commitHash; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTriggeredBy() { return triggeredBy; }
    public void setTriggeredBy(String triggeredBy) { this.triggeredBy = triggeredBy; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public long getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(long durationSeconds) { this.durationSeconds = durationSeconds; }
    public List<Stage> getStages() { return stages; }
    public void setStages(List<Stage> stages) { this.stages = stages; }
    public boolean isIsActiveDeployment() { return isActiveDeployment; }
    public void setIsActiveDeployment(boolean activeDeployment) { isActiveDeployment = activeDeployment; }
}
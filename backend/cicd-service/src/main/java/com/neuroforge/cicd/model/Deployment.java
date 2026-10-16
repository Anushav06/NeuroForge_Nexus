package com.neuroforge.cicd.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "deployments")
public class Deployment {

    @Id
    private String id;

    private String buildId;
    private String pipelineId;
    private String projectId;

    private Environment environment;

    private String version;
    private String imageTag;

    private Status status;

    private String deployedBy;

    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    private Long durationSeconds;

    private Integer replicasDesired;
    private Integer replicasReady;

    private Double cpuPercent;
    private Double memoryPercent;

    private String previousDeploymentId;
    private String rollbackReason;

    public enum Environment {
        DEV, STAGING, PROD
    }

    public enum Status {
        IN_PROGRESS, DEPLOYED, FAILED, ROLLED_BACK
    }

    public Deployment() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getBuildId() {
        return buildId;
    }

    public void setBuildId(String buildId) {
        this.buildId = buildId;
    }

    public String getPipelineId() {
        return pipelineId;
    }

    public void setPipelineId(String pipelineId) {
        this.pipelineId = pipelineId;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getImageTag() {
        return imageTag;
    }

    public void setImageTag(String imageTag) {
        this.imageTag = imageTag;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getDeployedBy() {
        return deployedBy;
    }

    public void setDeployedBy(String deployedBy) {
        this.deployedBy = deployedBy;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(LocalDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Long durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Integer getReplicasDesired() {
        return replicasDesired;
    }

    public void setReplicasDesired(Integer replicasDesired) {
        this.replicasDesired = replicasDesired;
    }

    public Integer getReplicasReady() {
        return replicasReady;
    }

    public void setReplicasReady(Integer replicasReady) {
        this.replicasReady = replicasReady;
    }

    public Double getCpuPercent() {
        return cpuPercent;
    }

    public void setCpuPercent(Double cpuPercent) {
        this.cpuPercent = cpuPercent;
    }

    public Double getMemoryPercent() {
        return memoryPercent;
    }

    public void setMemoryPercent(Double memoryPercent) {
        this.memoryPercent = memoryPercent;
    }

    public String getPreviousDeploymentId() {
        return previousDeploymentId;
    }

    public void setPreviousDeploymentId(String previousDeploymentId) {
        this.previousDeploymentId = previousDeploymentId;
    }

    public String getRollbackReason() {
        return rollbackReason;
    }

    public void setRollbackReason(String rollbackReason) {
        this.rollbackReason = rollbackReason;
    }
}
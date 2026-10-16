package com.neuroforge.cicd.dto;

public class ChangelogResponse {

    private String releaseId;
    private String version;
    private String name;
    private String notes;
    private String deploymentId;
    private String milestoneId;
    private String status;

    public ChangelogResponse() {
    }

    public ChangelogResponse(
            String releaseId,
            String version,
            String name,
            String notes,
            String deploymentId,
            String milestoneId,
            String status
    ) {
        this.releaseId = releaseId;
        this.version = version;
        this.name = name;
        this.notes = notes;
        this.deploymentId = deploymentId;
        this.milestoneId = milestoneId;
        this.status = status;
    }

    public String getReleaseId() {
        return releaseId;
    }

    public String getVersion() {
        return version;
    }

    public String getName() {
        return name;
    }

    public String getNotes() {
        return notes;
    }

    public String getDeploymentId() {
        return deploymentId;
    }

    public String getMilestoneId() {
        return milestoneId;
    }

    public String getStatus() {
        return status;
    }
}
package com.neuroforge.cicd.dto;

public class PipelineHealthResponse {

    private String pipelineId;
    private String pipelineName;
    private String healthStatus;
    private String latestBuildStatus;
    private Integer buildNumber;
    private String lastUpdated;

    public PipelineHealthResponse() {
    }

    public PipelineHealthResponse(
            String pipelineId,
            String pipelineName,
            String healthStatus,
            String latestBuildStatus,
            Integer buildNumber,
            String lastUpdated
    ) {
        this.pipelineId = pipelineId;
        this.pipelineName = pipelineName;
        this.healthStatus = healthStatus;
        this.latestBuildStatus = latestBuildStatus;
        this.buildNumber = buildNumber;
        this.lastUpdated = lastUpdated;
    }

    public String getPipelineId() {
        return pipelineId;
    }

    public String getPipelineName() {
        return pipelineName;
    }

    public String getHealthStatus() {
        return healthStatus;
    }

    public String getLatestBuildStatus() {
        return latestBuildStatus;
    }

    public Integer getBuildNumber() {
        return buildNumber;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }
}
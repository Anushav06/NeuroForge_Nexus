package com.neuroforge.cicd.dto;

public class PipelineMetricResponse {

    private String date;
    private long builds;
    private long successfulBuilds;
    private double successRate;
    private double avgBuildDurationMinutes;

    public PipelineMetricResponse() {
    }

    public PipelineMetricResponse(
            String date,
            long builds,
            long successfulBuilds,
            double successRate,
            double avgBuildDurationMinutes
    ) {
        this.date = date;
        this.builds = builds;
        this.successfulBuilds = successfulBuilds;
        this.successRate = successRate;
        this.avgBuildDurationMinutes = avgBuildDurationMinutes;
    }

    public String getDate() {
        return date;
    }

    public long getBuilds() {
        return builds;
    }

    public long getSuccessfulBuilds() {
        return successfulBuilds;
    }

    public double getSuccessRate() {
        return successRate;
    }

    public double getAvgBuildDurationMinutes() {
        return avgBuildDurationMinutes;
    }
}
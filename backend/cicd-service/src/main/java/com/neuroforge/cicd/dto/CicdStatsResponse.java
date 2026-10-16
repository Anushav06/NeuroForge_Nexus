package com.neuroforge.cicd.dto;

public class CicdStatsResponse {

    private long buildsPerDay;
    private double successRate;
    private double avgDeployMinutes;
    private String deployTrendPercent;

    public CicdStatsResponse() {
    }

    public CicdStatsResponse(
            long buildsPerDay,
            double successRate,
            double avgDeployMinutes,
            String deployTrendPercent
    ) {
        this.buildsPerDay = buildsPerDay;
        this.successRate = successRate;
        this.avgDeployMinutes = avgDeployMinutes;
        this.deployTrendPercent = deployTrendPercent;
    }

    public long getBuildsPerDay() {
        return buildsPerDay;
    }

    public double getSuccessRate() {
        return successRate;
    }

    public double getAvgDeployMinutes() {
        return avgDeployMinutes;
    }

    public String getDeployTrendPercent() {
        return deployTrendPercent;
    }
}
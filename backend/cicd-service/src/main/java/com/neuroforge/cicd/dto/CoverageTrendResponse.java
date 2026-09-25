package com.neuroforge.cicd.dto;

public class CoverageTrendResponse {

    private String date;
    private Integer buildNumber;
    private Double coveragePercent;

    public CoverageTrendResponse() {
    }

    public CoverageTrendResponse(String date, Integer buildNumber, Double coveragePercent) {
        this.date = date;
        this.buildNumber = buildNumber;
        this.coveragePercent = coveragePercent;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public Integer getBuildNumber() {
        return buildNumber;
    }

    public void setBuildNumber(Integer buildNumber) {
        this.buildNumber = buildNumber;
    }

    public Double getCoveragePercent() {
        return coveragePercent;
    }

    public void setCoveragePercent(Double coveragePercent) {
        this.coveragePercent = coveragePercent;
    }
}
package com.neuroforge.cicd.model;

import java.util.ArrayList;
import java.util.List;

public class TestResult {

    private int passed;
    private int failed;
    private int skipped;
    private int total;

    private double coveragePercent;

    private Long durationSeconds;

    private List<TestFailure> failures = new ArrayList<>();

    private SonarResult sonar;

    public TestResult() {
    }

    public int getPassed() {
        return passed;
    }

    public void setPassed(int passed) {
        this.passed = passed;
    }

    public int getFailed() {
        return failed;
    }

    public void setFailed(int failed) {
        this.failed = failed;
    }

    public int getSkipped() {
        return skipped;
    }

    public void setSkipped(int skipped) {
        this.skipped = skipped;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public double getCoveragePercent() {
        return coveragePercent;
    }

    public void setCoveragePercent(double coveragePercent) {
        this.coveragePercent = coveragePercent;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Long durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public List<TestFailure> getFailures() {
        return failures;
    }

    public void setFailures(List<TestFailure> failures) {
        this.failures = failures;
    }

    public SonarResult getSonar() {
        return sonar;
    }

    public void setSonar(SonarResult sonar) {
        this.sonar = sonar;
    }
}
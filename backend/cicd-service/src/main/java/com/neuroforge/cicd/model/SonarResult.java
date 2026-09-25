package com.neuroforge.cicd.model;

public class SonarResult {

    public enum QualityGate {
        PASSED,
        FAILED
    }

    private QualityGate qualityGate;

    private int bugs;
    private int vulnerabilities;
    private int codeSmells;

    private double duplicationPercent;

    public SonarResult() {
    }

    public QualityGate getQualityGate() {
        return qualityGate;
    }

    public void setQualityGate(QualityGate qualityGate) {
        this.qualityGate = qualityGate;
    }

    public int getBugs() {
        return bugs;
    }

    public void setBugs(int bugs) {
        this.bugs = bugs;
    }

    public int getVulnerabilities() {
        return vulnerabilities;
    }

    public void setVulnerabilities(int vulnerabilities) {
        this.vulnerabilities = vulnerabilities;
    }

    public int getCodeSmells() {
        return codeSmells;
    }

    public void setCodeSmells(int codeSmells) {
        this.codeSmells = codeSmells;
    }

    public double getDuplicationPercent() {
        return duplicationPercent;
    }

    public void setDuplicationPercent(double duplicationPercent) {
        this.duplicationPercent = duplicationPercent;
    }
}
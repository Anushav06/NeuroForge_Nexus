package com.neuroforge.cicd.dto;

import com.neuroforge.cicd.model.Deployment;

public class DeploymentHealthRequest {

    private Deployment.Status status;
    private Integer replicasDesired;
    private Integer replicasReady;
    private Double cpuPercent;
    private Double memoryPercent;

    public DeploymentHealthRequest() {
    }

    public Deployment.Status getStatus() {
        return status;
    }

    public void setStatus(Deployment.Status status) {
        this.status = status;
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
}
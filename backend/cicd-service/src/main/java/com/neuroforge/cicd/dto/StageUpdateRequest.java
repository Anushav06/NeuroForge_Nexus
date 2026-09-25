package com.neuroforge.cicd.dto;

import com.neuroforge.cicd.model.BuildStage;

public class StageUpdateRequest {

    private BuildStage.Status status;
    private String logs;

    public StageUpdateRequest() {
    }

    public BuildStage.Status getStatus() {
        return status;
    }

    public void setStatus(BuildStage.Status status) {
        this.status = status;
    }

    public String getLogs() {
        return logs;
    }

    public void setLogs(String logs) {
        this.logs = logs;
    }
}
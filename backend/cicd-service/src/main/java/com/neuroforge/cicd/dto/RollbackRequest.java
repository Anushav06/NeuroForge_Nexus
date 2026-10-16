package com.neuroforge.cicd.dto;

public class RollbackRequest {

    private String rollbackReason;

    public RollbackRequest() {
    }

    public String getRollbackReason() {
        return rollbackReason;
    }

    public void setRollbackReason(String rollbackReason) {
        this.rollbackReason = rollbackReason;
    }
}
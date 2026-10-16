package com.neuroforge.cicd.bug.dto;

import com.neuroforge.cicd.bug.Bug;
import jakarta.validation.constraints.NotNull;

public class UpdateBugStatusRequest {

    @NotNull(message = "Bug status is required")
    private Bug.Status status;

    public UpdateBugStatusRequest() {
    }

    public Bug.Status getStatus() {
        return status;
    }

    public void setStatus(Bug.Status status) {
        this.status = status;
    }
}
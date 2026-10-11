package com.neuroforge.cicd.bug.dto;

public class AssignBugRequest {

    private String assignedTo;

    public AssignBugRequest() {
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }
}
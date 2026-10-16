package com.neuroforge.cicd.bug.dto;

import jakarta.validation.constraints.NotBlank;

import jakarta.validation.constraints.Size;

import com.neuroforge.cicd.bug.Bug;

public class CreateBugRequest {

    @NotBlank(message = "Bug title is required")
    @Size(max = 200, message = "Title cannot exceed 200 characters")
    private String title;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @Size(max = 100, message = "Module cannot exceed 100 characters")
    private String module;

    private Bug.Environment environment;

    private Bug.Severity severity;

    private Bug.Priority priority;

    private String assignedTo;

    public CreateBugRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public Bug.Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Bug.Environment environment) {
        this.environment = environment;
    }

    public Bug.Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Bug.Severity severity) {
        this.severity = severity;
    }

    public Bug.Priority getPriority() {
        return priority;
    }

    public void setPriority(Bug.Priority priority) {
        this.priority = priority;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }
}
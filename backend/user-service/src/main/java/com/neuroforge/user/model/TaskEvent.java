package com.neuroforge.user.model;

public class TaskEvent {

    private String eventType;
    private String taskId;
    private String projectId;
    private String sprintId;
    private String status;
    private String assignedTo;

    public TaskEvent() {
    }

    public TaskEvent(
            String eventType,
            String taskId,
            String projectId,
            String sprintId,
            String status,
            String assignedTo
    ) {
        this.eventType = eventType;
        this.taskId = taskId;
        this.projectId = projectId;
        this.sprintId = sprintId;
        this.status = status;
        this.assignedTo = assignedTo;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getSprintId() {
        return sprintId;
    }

    public void setSprintId(String sprintId) {
        this.sprintId = sprintId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }
}
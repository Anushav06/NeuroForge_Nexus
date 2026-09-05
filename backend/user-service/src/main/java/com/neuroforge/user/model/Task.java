package com.neuroforge.user.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "tasks")
public class Task {

    @Id
    private String id;

    private String projectId;
    private String sprintId;

    private String title;
    private String description;

    private String assignedTo;

    private String status;
    private String priority;

    private Integer storyPoints;
    private Integer progress;
    

    // If null, this is a main task.
    // If it contains another task's ID, this is a subtask.
    private String parentTaskId;
    private String blockedByTaskId;
    private String blockerReason;

    public Task() {
    }

    public Task(
            String id,
            String projectId,
            String sprintId,
            String title,
            String description,
            String assignedTo,
            String status,
            String priority,
            Integer storyPoints,
            Integer progress,
            String parentTaskId
    ) {
        this.id = id;
        this.projectId = projectId;
        this.sprintId = sprintId;
        this.title = title;
        this.description = description;
        this.assignedTo = assignedTo;
        this.status = status;
        this.priority = priority;
        this.storyPoints = storyPoints;
        this.progress = progress;
        this.parentTaskId = parentTaskId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Integer getStoryPoints() {
        return storyPoints;
    }

    public void setStoryPoints(Integer storyPoints) {
        this.storyPoints = storyPoints;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public String getParentTaskId() {
        return parentTaskId;
    }

    public void setParentTaskId(String parentTaskId) {
        this.parentTaskId = parentTaskId;
    }

    public String getBlockedByTaskId() {
    return blockedByTaskId;
}

public void setBlockedByTaskId(String blockedByTaskId) {
    this.blockedByTaskId = blockedByTaskId;
}

public String getBlockerReason() {
    return blockerReason;
}

public void setBlockerReason(String blockerReason) {
    this.blockerReason = blockerReason;
}
}
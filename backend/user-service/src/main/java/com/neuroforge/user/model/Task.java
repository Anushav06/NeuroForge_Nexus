package com.neuroforge.user.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "tasks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Task {

    public enum Status { TODO, IN_PROGRESS, REVIEW, DONE }
    public enum Priority { LOW, MEDIUM, HIGH }

    @Id
    private String id;

    private String title;
    private String description;
    private String sprintId;
    private String assigneeId;
    private Status status;
    private Priority priority;
}
package com.neuroforge.user.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "sprints")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Sprint {

    public enum Status { PLANNED, ACTIVE, COMPLETED }

    @Id
    private String id;

    private int sprintNumber;
    private String projectId;
    private Status status;
    private int taskCount;
    private LocalDate startDate;
    private LocalDate endDate;
}
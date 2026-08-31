package com.neuroforge.user.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "milestones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Milestone {

    public enum Status { UPCOMING, IN_PROGRESS, RELEASED }

    @Id
    private String id;

    private String name;
    private String projectId;
    private LocalDate dueDate;
    private Status status;
}